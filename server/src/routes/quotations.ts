import type { FastifyInstance } from "fastify";
import { guard } from "../auth";
import { prisma, type Tx } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import * as s from "../serialize";
import { quotationCreateSchema, quotationStatusSchema, quotationUpdateSchema } from "../schemas";
import { invoiceFrom, salesOrderFrom } from "../services/documents";
import { lineRows } from "../services/lines";
import { nextNumber } from "../services/numbering";

const load = async (tx: Tx, id: string) => {
  const q = await tx.quotation.findUnique({ where: { id }, include: s.quotationInclude });
  if (!q) throw notFound("Quotation");
  return q;
};
const isConverted = (q: Awaited<ReturnType<typeof load>>) => Boolean(q.salesOrder || q.invoices.length);

/** Lock the row so concurrent conversions of the same quotation queue up behind each other. */
const lock = (tx: Tx, id: string) => tx.$executeRaw`SELECT 1 FROM "Quotation" WHERE id = ${id} FOR UPDATE`;

async function loadConvertible(tx: Tx, id: string) {
  await lock(tx, id);
  const q = await load(tx, id);
  if (isConverted(q)) throw conflict(`${q.number} has already been converted.`);
  if (q.status === "Rejected" || q.status === "Expired") throw badRequest(`${q.number} is ${q.status.toLowerCase()}.`);
  return q;
}

export default async function quotationRoutes(app: FastifyInstance) {
  const write = { preHandler: guard("sales:write") };

  app.get("/quotations", { preHandler: guard("sales:read") }, async () =>
    (await prisma.quotation.findMany({ include: s.quotationInclude, orderBy: { date: "desc" } })).map(s.quotation),
  );

  app.post("/quotations", write, async (request) => {
    const { lines, date, validUntil, ...data } = quotationCreateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const q = await tx.quotation.create({
        data: {
          ...data,
          number: await nextNumber(tx, "quotation"),
          date: s.toDate(date),
          validUntil: s.toDate(validUntil),
          lines: { create: lineRows(lines) },
        },
      });
      return s.quotation(await load(tx, q.id));
    });
  });

  app.patch<{ Params: { id: string } }>("/quotations/:id", write, async (request) => {
    const { lines, date, validUntil, ...data } = quotationUpdateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      await lock(tx, request.params.id);
      const q = await load(tx, request.params.id);
      if (isConverted(q)) throw conflict("Converted quotations cannot be edited.");
      if (lines) await tx.quotationLine.deleteMany({ where: { quotationId: q.id } });
      await tx.quotation.update({
        where: { id: q.id },
        data: {
          ...data,
          ...(date ? { date: s.toDate(date) } : {}),
          ...(validUntil ? { validUntil: s.toDate(validUntil) } : {}),
          ...(lines ? { lines: { create: lineRows(lines) } } : {}),
        },
      });
      return s.quotation(await load(tx, q.id));
    });
  });

  app.post<{ Params: { id: string } }>("/quotations/:id/status", write, async (request) => {
    const { status } = quotationStatusSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const q = await load(tx, request.params.id);
      if (isConverted(q) && status !== "Accepted") throw conflict("Converted quotations must stay accepted.");
      await tx.quotation.update({ where: { id: q.id }, data: { status } });
      return s.quotation(await load(tx, q.id));
    });
  });

  app.delete<{ Params: { id: string } }>("/quotations/:id", write, async (request) => {
    await prisma.$transaction(async (tx) => {
      const q = await load(tx, request.params.id);
      if (isConverted(q)) throw conflict("Converted quotations cannot be deleted.");
      await tx.quotation.delete({ where: { id: q.id } });
    });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/quotations/:id/convert-to-sales-order", write, async (request) =>
    prisma.$transaction(async (tx) => {
      const q = await loadConvertible(tx, request.params.id);
      const order = await salesOrderFrom(tx, q);
      await tx.quotation.update({ where: { id: q.id }, data: { status: "Accepted" } });
      return order;
    }),
  );

  app.post<{ Params: { id: string } }>(
    "/quotations/:id/convert-to-invoice",
    { preHandler: guard("sales:write", "invoices:write") },
    async (request) =>
      prisma.$transaction(async (tx) => {
        const q = await loadConvertible(tx, request.params.id);
        const invoice = await invoiceFrom(tx, q, { quotationId: q.id });
        await tx.quotation.update({ where: { id: q.id }, data: { status: "Accepted" } });
        return invoice;
      }),
  );
}
