import type { FastifyInstance } from "fastify";
import { guard } from "../auth";
import { prisma } from "../db";
import { conflict } from "../errors";
import * as s from "../serialize";
import { customerSchema } from "../schemas";

export default async function customerRoutes(app: FastifyInstance) {
  const write = { preHandler: guard("customers:write") };

  app.get("/customers", { preHandler: guard("customers:read") }, async () =>
    (await prisma.customer.findMany({ orderBy: { name: "asc" } })).map(s.customer),
  );

  app.post("/customers", write, async (request) =>
    s.customer(await prisma.customer.create({ data: customerSchema.parse(request.body) })),
  );

  app.patch<{ Params: { id: string } }>("/customers/:id", write, async (request) =>
    s.customer(
      await prisma.customer.update({ where: { id: request.params.id }, data: customerSchema.partial().parse(request.body) }),
    ),
  );

  app.delete<{ Params: { id: string } }>("/customers/:id", write, async (request) => {
    const id = request.params.id;
    const [jobs, quotes, orders, invoices] = await Promise.all([
      prisma.serviceJob.count({ where: { customerId: id } }),
      prisma.quotation.count({ where: { customerId: id } }),
      prisma.salesOrder.count({ where: { customerId: id } }),
      prisma.invoice.count({ where: { customerId: id } }),
    ]);
    if (jobs + quotes + orders + invoices > 0) {
      throw conflict("Customer has quotations, orders, invoices or jobs and cannot be deleted.");
    }
    await prisma.customer.delete({ where: { id } });
    return { ok: true };
  });
}
