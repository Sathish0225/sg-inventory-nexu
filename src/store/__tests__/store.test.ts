import { beforeEach, describe, expect, it } from "vitest";
import { balanceDue, invoiceDisplayStatus } from "@/lib/calc";
import { useStore } from "@/store/useStore";

const s = () => useStore.getState();
const stockOf = (id: string) => s().inventory.find((i) => i.id === id)!.currentStock;

beforeEach(() => s().resetDemoData());

describe("quotation → sales order → invoice", () => {
  it("converts, fulfils (deducting stock) and collects payment", () => {
    const q = s().quotations.find((x) => x.status === "Sent")!;
    const soResult = s().convertQuotationToSalesOrder(q.id);
    expect(soResult.ok).toBe(true);
    if (!soResult.ok) return;
    const so = soResult.value;
    expect(so.lines).toHaveLength(q.lines.length);
    expect(s().quotations.find((x) => x.id === q.id)!.status).toBe("Accepted");
    expect(s().convertQuotationToSalesOrder(q.id).ok).toBe(false);

    // Quote asks for 200 LED bulbs; only 15 in stock.
    const blocked = s().fulfilSalesOrder(so.id);
    expect(blocked.ok).toBe(false);
    expect(stockOf("inv-led12")).toBe(15);

    expect(s().adjustStock("inv-led12", 300, "PO-1").ok).toBe(true);
    expect(s().fulfilSalesOrder(so.id).ok).toBe(true);
    expect(stockOf("inv-led12")).toBe(115);

    const invResult = s().convertSalesOrderToInvoice(so.id);
    expect(invResult.ok).toBe(true);
    if (!invResult.ok) return;
    const invId = invResult.value.id;
    expect(s().recordPayment(invId, { date: "2026-01-01", amount: 10, method: "Cash", reference: "" }).ok).toBe(false);
    expect(s().issueInvoice(invId).ok).toBe(true);

    const inv = () => s().invoices.find((x) => x.id === invId)!;
    const due = balanceDue(inv());
    expect(s().recordPayment(invId, { date: "2026-01-01", amount: due + 1, method: "PayNow", reference: "" }).ok).toBe(false);
    expect(s().recordPayment(invId, { date: "2026-01-01", amount: due, method: "PayNow", reference: "" }).ok).toBe(true);
    expect(invoiceDisplayStatus(inv())).toBe("Paid");
    expect(s().deleteInvoice(invId).ok).toBe(false);
  });

  it("issues sequential document numbers", () => {
    const year = new Date().getFullYear();
    const q = s().createQuotation({ ...s().quotations[0], status: "Draft" });
    expect(q.number).toBe(`QT-${year}-0004`);
    expect(s().createQuotation({ ...s().quotations[0], status: "Draft" }).number).toBe(`QT-${year}-0005`);
  });

  it("voiding an invoice releases the source document", () => {
    const q = s().quotations.find((x) => x.status === "Draft")!;
    const r = s().convertQuotationToInvoice(q.id);
    if (!r.ok) throw new Error(r.error);
    expect(s().voidInvoice(r.value.id).ok).toBe(true);
    expect(s().quotations.find((x) => x.id === q.id)!.invoiceId).toBeNull();
  });
});

describe("service attendance", () => {
  it("checks in, blocks double check-in, and checks out", () => {
    const job = s().jobs.find((j) => j.status === "Scheduled")!;
    const r = s().checkIn(job.id, "David Wong");
    expect(r.ok).toBe(true);
    expect(s().jobs.find((j) => j.id === job.id)!.status).toBe("In Progress");
    expect(s().checkIn(job.id, "David Wong").ok).toBe(false);
    if (!r.ok) return;
    expect(s().checkOut(r.value.id, "Done").ok).toBe(true);
    expect(s().attendance.find((a) => a.id === r.value.id)!.checkOut).not.toBeNull();
  });

  it("deducts parts once on completion and invoices parts + labour", () => {
    const job = s().jobs.find((j) => j.status === "In Progress")!;
    const before = stockOf("inv-sw24");
    expect(s().updateJob(job.id, { status: "Completed" }).ok).toBe(true);
    expect(stockOf("inv-sw24")).toBe(before - 1);
    expect(s().updateJob(job.id, { status: "Completed" }).ok).toBe(true);
    expect(stockOf("inv-sw24")).toBe(before - 1);

    const completedWithHours = s().jobs.find((j) => j.id === "job-1")!;
    const r = s().createInvoiceFromJob(completedWithHours.id);
    if (!r.ok) throw new Error(r.error);
    const labour = r.value.lines.find((l) => l.description.startsWith("Labour"))!;
    expect(labour.quantity).toBe(3.25);
    expect(s().createInvoiceFromJob(completedWithHours.id).ok).toBe(false);
  });
});
