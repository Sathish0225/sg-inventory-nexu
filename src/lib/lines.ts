import { uid } from "@/lib/id";
import type { LineItem } from "@/types";

export const newLine = (): LineItem => ({
  id: uid(),
  itemId: null,
  description: "",
  quantity: 1,
  unitPrice: 0,
  discountPct: 0,
});
