import { todayISO } from "@/lib/calc";
import type { Tx } from "../db";
import { conflict, notFound } from "../errors";
import { toDate } from "../serialize";

/**
 * Apply a signed stock change and record the movement.
 * Deductions use a conditional UPDATE (… WHERE currentStock >= qty) so concurrent requests can't
 * oversell; a CHECK constraint on the table is the final backstop.
 */
export async function adjustStock(
  tx: Tx,
  itemId: string,
  delta: number,
  reference: string,
  note: string,
  userId: string | null,
) {
  const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) throw notFound("Inventory item");
  const lastUpdated = toDate(todayISO());
  if (delta < 0) {
    const { count } = await tx.inventoryItem.updateMany({
      where: { id: itemId, currentStock: { gte: -delta } },
      data: { currentStock: { decrement: -delta }, lastUpdated },
    });
    if (count === 0) {
      const current = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      throw conflict(`Insufficient stock for ${item.name}: ${Number(current.currentStock)} available, ${-delta} required.`);
    }
  } else {
    await tx.inventoryItem.update({ where: { id: itemId }, data: { currentStock: { increment: delta }, lastUpdated } });
  }
  await tx.stockMovement.create({
    data: {
      itemId,
      itemName: item.name,
      type: delta > 0 ? "in" : "out",
      quantity: delta,
      reference,
      note,
      userId,
    },
  });
}

/** Deduct several items at once, aggregating repeated items. All-or-nothing within the transaction. */
export async function deductAll(
  tx: Tx,
  items: { itemId: string | null; quantity: number }[],
  reference: string,
  note: string,
  userId: string | null,
) {
  const needed = new Map<string, number>();
  for (const { itemId, quantity } of items) {
    if (itemId) needed.set(itemId, (needed.get(itemId) ?? 0) + quantity);
  }
  for (const [itemId, qty] of needed) {
    // Items deleted since the line was written are skipped.
    if (await tx.inventoryItem.findUnique({ where: { id: itemId }, select: { id: true } })) {
      await adjustStock(tx, itemId, -qty, reference, note, userId);
    }
  }
}
