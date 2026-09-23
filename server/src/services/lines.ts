import type { LineItem } from "@/types";
import type { LineInput } from "../schemas";

/** Rows for a nested `lines: { create: … }`, keeping the order the user entered. */
export const lineRows = (lines: (LineInput | LineItem)[]) =>
  lines.map((l, position) => ({
    itemId: l.itemId,
    description: l.description,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct ?? 0,
    position,
  }));
