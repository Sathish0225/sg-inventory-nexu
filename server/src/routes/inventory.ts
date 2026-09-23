import type { FastifyInstance } from "fastify";
import { todayISO } from "@/lib/calc";
import { guard, requireUser } from "../auth";
import { prisma } from "../db";
import * as s from "../serialize";
import { inventoryCreateSchema, inventoryUpdateSchema, stockAdjustSchema } from "../schemas";
import { adjustStock } from "../services/stock";

export default async function inventoryRoutes(app: FastifyInstance) {
  const read = { preHandler: guard("inventory:read") };
  const write = { preHandler: guard("inventory:write") };

  app.get("/inventory", read, async () =>
    (await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } })).map(s.inventoryItem),
  );

  app.get<{ Querystring: { limit?: string } }>("/stock-movements", read, async (request) => {
    const limit = Math.min(500, Math.max(1, Number(request.query.limit) || 100));
    return (await prisma.stockMovement.findMany({ orderBy: { at: "desc" }, take: limit })).map(s.stockMovement);
  });

  app.post("/inventory", write, async (request) => {
    const user = requireUser(request);
    const { currentStock, ...data } = inventoryCreateSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({ data: { ...data, lastUpdated: s.toDate(todayISO()) } });
      // Opening stock is recorded as a movement so the history adds up.
      if (currentStock > 0) await adjustStock(tx, item.id, currentStock, "Opening stock", "", user.id);
      return s.inventoryItem(await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } }));
    });
  });

  app.patch<{ Params: { id: string } }>("/inventory/:id", write, async (request) => {
    const data = inventoryUpdateSchema.parse(request.body);
    return s.inventoryItem(
      await prisma.inventoryItem.update({
        where: { id: request.params.id },
        data: { ...data, lastUpdated: s.toDate(todayISO()) },
      }),
    );
  });

  app.delete<{ Params: { id: string } }>("/inventory/:id", write, async (request) => {
    // Document lines and movements keep their text; their item link is cleared (ON DELETE SET NULL).
    await prisma.inventoryItem.delete({ where: { id: request.params.id } });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/inventory/:id/adjust", write, async (request) => {
    const user = requireUser(request);
    const { delta, reference, note } = stockAdjustSchema.parse(request.body);
    return prisma.$transaction(async (tx) => {
      await adjustStock(tx, request.params.id, delta, reference || (delta > 0 ? "Stock in" : "Stock out"), note, user.id);
      return s.inventoryItem(await tx.inventoryItem.findUniqueOrThrow({ where: { id: request.params.id } }));
    });
  });
}
