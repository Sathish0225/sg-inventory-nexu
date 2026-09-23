import { addDays, todayISO } from "@/lib/calc";
import type { Tx } from "../db";
import * as s from "../serialize";
import { lineRows } from "./lines";
import { nextNumber } from "./numbering";

interface SourceDoc {
  id: string;
  number: string;
  customerId: string;
  gstRate: unknown;
  reference: string;
  notes: string;
  lines: { itemId: string | null; description: string; quantity: unknown; unitPrice: unknown; discountPct: unknown; position: number }[];
}

const copyLines = (doc: SourceDoc) =>
  lineRows(
    [...doc.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        itemId: l.itemId,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        discountPct: Number(l.discountPct),
      })),
  );

/** Create a draft invoice copying a quotation's or sales order's lines. */
export async function invoiceFrom(tx: Tx, doc: SourceDoc, link: { quotationId?: string; salesOrderId?: string }) {
  const settings = await tx.settings.findUniqueOrThrow({ where: { id: 1 } });
  const today = todayISO();
  const invoice = await tx.invoice.create({
    data: {
      number: await nextNumber(tx, "invoice"),
      customerId: doc.customerId,
      date: s.toDate(today),
      dueDate: s.toDate(addDays(today, settings.paymentTermsDays)),
      status: "Draft",
      gstRate: Number(doc.gstRate),
      reference: doc.reference || doc.number,
      notes: "",
      ...link,
      lines: { create: copyLines(doc) },
    },
    include: s.invoiceInclude,
  });
  return s.invoice(invoice);
}

export async function salesOrderFrom(tx: Tx, quote: SourceDoc) {
  const today = todayISO();
  const order = await tx.salesOrder.create({
    data: {
      number: await nextNumber(tx, "salesOrder"),
      customerId: quote.customerId,
      quotationId: quote.id,
      date: s.toDate(today),
      deliveryDate: s.toDate(addDays(today, 7)),
      status: "Pending",
      gstRate: Number(quote.gstRate),
      reference: quote.reference || quote.number,
      notes: quote.notes,
      lines: { create: copyLines(quote) },
    },
    include: s.salesOrderInclude,
  });
  return s.salesOrder(order);
}
