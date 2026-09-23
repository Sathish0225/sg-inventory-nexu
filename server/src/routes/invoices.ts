import type { FastifyInstance } from "fastify";
import { balanceDue, roundMoney } from "@/lib/calc";
import { guard, requireUser } from "../auth";
import { prisma, type Tx } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import * as s from "../serialize";
import { invoiceCreateSchema, invoiceUpdateSchema, paymentSchema } from "../schemas";
import { lineRows } from "../services/lines";
import { nextNumber } from "../services/numbering";

/** Lock the invoice row: payments and status changes on one invoice are serialised. */
const loadLocked = async (tx: Tx, id: string) => {
  await tx.$executeRaw`SELECT 1 FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
  const inv = await tx.invoice.findUnique({ where: { id }, include: s.invoiceInclude });
  if (!inv) throw notFound("Invoice");
  return inv;
};
const reload = async (tx: Tx, id: string) =>
  s.invoice(await tx.invoice.findUniqueOrThrow({ where: { id }, include: s.invoiceInclude }));

export default async function invoiceRoutes(app: FastifyInstance) {
  const write = { preHandler: guard("invoices:write") };

  app.get("/invoices", { preHandler: guard("invoices:read") }, async () =>
    (await prisma.invoice.findMany({ include: s.invoiceInclude, orderBy: { date: "desc" } })).map(s.invoice),
  );

  app.post("/invoices", write, async (request) => {
    const { lines, date, dueDate, ...data } = invoiceCreateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          ...data,
          status: "Draft",
          number: await nextNumber(tx, "invoice"),
          date: s.toDate(date),
          dueDate: s.toDate(dueDate),
          lines: { create: lineRows(lines) },
        },
      });
      return reload(tx, inv.id);
    });
  });

  app.patch<{ Params: { id: string } }>("/invoices/:id", write, async (request) => {
    const { lines, date, dueDate, ...data } = invoiceUpdateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      if (inv.status !== "Draft") throw conflict("Only draft invoices can be edited. Void and re-issue instead.");
      if (lines) await tx.invoiceLine.deleteMany({ where: { invoiceId: inv.id } });
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          ...data,
          ...(date ? { date: s.toDate(date) } : {}),
          ...(dueDate ? { dueDate: s.toDate(dueDate) } : {}),
          ...(lines ? { lines: { create: lineRows(lines) } } : {}),
        },
      });
      return reload(tx, inv.id);
    });
  });

  app.post<{ Params: { id: string } }>("/invoices/:id/issue", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      if (inv.status !== "Draft") throw conflict("Invoice has already been issued.");
      if (inv.lines.length === 0) throw badRequest("Add at least one line before issuing.");
      await tx.invoice.update({ where: { id: inv.id }, data: { status: "Issued" } });
      return reload(tx, inv.id);
    }),
  );

  app.post<{ Params: { id: string } }>("/invoices/:id/void", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      if (inv.status === "Void") throw conflict("Invoice is already void.");
      if (inv.payments.length) throw conflict("Remove recorded payments before voiding.");
      // The source link is kept for audit; void invoices no longer count as "the" invoice.
      await tx.invoice.update({ where: { id: inv.id }, data: { status: "Void" } });
      return reload(tx, inv.id);
    }),
  );

  app.delete<{ Params: { id: string } }>("/invoices/:id", write, async (request) => {
    await prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      // Issued tax invoices must be kept (IRAS: 5 years); void them instead.
      if (inv.status !== "Draft") throw conflict("Only draft invoices can be deleted. Void issued invoices instead.");
      await tx.invoice.delete({ where: { id: inv.id } });
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/invoices/:id/payments", write, async (request) => {
    const user = requireUser(request);
    const { date, amount, method, reference } = paymentSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      if (inv.status !== "Issued") throw conflict("Payments can only be recorded against issued invoices.");
      const rounded = roundMoney(amount);
      const balance = balanceDue(s.invoice(inv));
      if (rounded > balance) throw badRequest(`Payment exceeds the balance due (S$${balance.toFixed(2)}).`);
      await tx.payment.create({
        data: { invoiceId: inv.id, date: s.toDate(date), amount: rounded, method, reference, createdById: user.id },
      });
      return reload(tx, inv.id);
    });
  });

  app.delete<{ Params: { id: string; paymentId: string } }>("/invoices/:id/payments/:paymentId", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const inv = await loadLocked(tx, request.params.id);
      if (inv.status !== "Issued") throw conflict("Payments can only be removed from issued invoices.");
      const { count } = await tx.payment.deleteMany({ where: { id: request.params.paymentId, invoiceId: inv.id } });
      if (count === 0) throw notFound("Payment");
      return reload(tx, inv.id);
    }),
  );
}
