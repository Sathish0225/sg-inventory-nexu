import type { FastifyInstance } from "fastify";
import { guard, requireUser } from "../auth";
import { prisma, type Tx } from "../db";
import { conflict, notFound } from "../errors";
import * as s from "../serialize";
import { salesOrderCreateSchema, salesOrderUpdateSchema } from "../schemas";
import { invoiceFrom } from "../services/documents";
import { lineRows } from "../services/lines";
import { nextNumber } from "../services/numbering";
import { deductAll } from "../services/stock";

/** Load with a row lock so status transitions on the same order are serialised. */
const loadLocked = async (tx: Tx, id: string) => {
  await tx.$executeRaw`SELECT 1 FROM "SalesOrder" WHERE id = ${id} FOR UPDATE`;
  const o = await tx.salesOrder.findUnique({ where: { id }, include: s.salesOrderInclude });
  if (!o) throw notFound("Sales order");
  return o;
};
const reload = async (tx: Tx, id: string) =>
  s.salesOrder(await tx.salesOrder.findUniqueOrThrow({ where: { id }, include: s.salesOrderInclude }));

export default async function salesOrderRoutes(app: FastifyInstance) {
  const write = { preHandler: guard("sales:write") };

  app.get("/sales-orders", { preHandler: guard("sales:read") }, async () =>
    (await prisma.salesOrder.findMany({ include: s.salesOrderInclude, orderBy: { date: "desc" } })).map(s.salesOrder),
  );

  app.post("/sales-orders", write, async (request) => {
    const { lines, date, deliveryDate, ...data } = salesOrderCreateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const o = await tx.salesOrder.create({
        data: {
          ...data,
          status: "Pending",
          number: await nextNumber(tx, "salesOrder"),
          date: s.toDate(date),
          deliveryDate: s.toDate(deliveryDate),
          lines: { create: lineRows(lines) },
        },
      });
      return reload(tx, o.id);
    });
  });

  app.patch<{ Params: { id: string } }>("/sales-orders/:id", write, async (request) => {
    const { lines, date, deliveryDate, ...data } = salesOrderUpdateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const o = await loadLocked(tx, request.params.id);
      if (o.status === "Fulfilled" || o.status === "Cancelled") throw conflict(`${o.status} orders cannot be edited.`);
      if (lines) await tx.salesOrderLine.deleteMany({ where: { salesOrderId: o.id } });
      await tx.salesOrder.update({
        where: { id: o.id },
        data: {
          ...data,
          ...(date ? { date: s.toDate(date) } : {}),
          ...(deliveryDate ? { deliveryDate: s.toDate(deliveryDate) } : {}),
          ...(lines ? { lines: { create: lineRows(lines) } } : {}),
        },
      });
      return reload(tx, o.id);
    });
  });

  app.post<{ Params: { id: string } }>("/sales-orders/:id/confirm", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const o = await loadLocked(tx, request.params.id);
      if (o.status !== "Pending") throw conflict("Only pending orders can be confirmed.");
      await tx.salesOrder.update({ where: { id: o.id }, data: { status: "Confirmed" } });
      return reload(tx, o.id);
    }),
  );

  app.post<{ Params: { id: string } }>(
    "/sales-orders/:id/fulfil",
    { preHandler: guard("sales:write", "inventory:write") },
    async (request) => {
      const user = requireUser(request);
      return prisma.$transaction(async (tx) => {
        const o = await loadLocked(tx, request.params.id);
        if (o.status === "Fulfilled" || o.status === "Cancelled") throw conflict(`Order is already ${o.status.toLowerCase()}.`);
        // Any shortage throws and rolls back every deduction made so far.
        await deductAll(
          tx,
          o.lines.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
          o.number,
          "Sales order fulfilment",
          user.id,
        );
        await tx.salesOrder.update({ where: { id: o.id }, data: { status: "Fulfilled", fulfilledAt: new Date() } });
        return reload(tx, o.id);
      });
    },
  );

  app.post<{ Params: { id: string } }>("/sales-orders/:id/cancel", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const o = await loadLocked(tx, request.params.id);
      if (o.status === "Fulfilled") throw conflict("Fulfilled orders cannot be cancelled. Issue a credit instead.");
      if (o.invoices.length) throw conflict("Void the linked invoice before cancelling this order.");
      await tx.salesOrder.update({ where: { id: o.id }, data: { status: "Cancelled" } });
      return reload(tx, o.id);
    }),
  );

  app.delete<{ Params: { id: string } }>("/sales-orders/:id", write, async (request) => {
    await prisma.$transaction(async (tx) => {
      const o = await loadLocked(tx, request.params.id);
      if (o.status === "Fulfilled" || o.invoices.length) throw conflict("Fulfilled or invoiced orders cannot be deleted.");
      // Deleting releases the source quotation (its salesOrder link disappears with this row).
      await tx.salesOrder.delete({ where: { id: o.id } });
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>(
    "/sales-orders/:id/invoice",
    { preHandler: guard("sales:read", "invoices:write") },
    async (request) =>
      prisma.$transaction(async (tx) => {
        const o = await loadLocked(tx, request.params.id);
        if (o.invoices.length) throw conflict(`${o.number} has already been invoiced.`);
        if (o.status === "Cancelled") throw conflict("Cancelled orders cannot be invoiced.");
        return invoiceFrom(tx, o, { salesOrderId: o.id });
      }),
  );
}
