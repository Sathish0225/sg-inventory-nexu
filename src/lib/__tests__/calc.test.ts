import { describe, expect, it } from "vitest";
import {
  addDays,
  attendanceHours,
  documentTotals,
  formatDocNumber,
  formatHours,
  invoiceDisplayStatus,
  roundMoney,
  stockStatus,
} from "@/lib/calc";
import { csvCell, escapeHtml } from "@/lib/html";
import type { InventoryItem, Invoice } from "@/types";

const line = (quantity: number, unitPrice: number, discountPct = 0) => ({
  id: "x",
  itemId: null,
  description: "",
  quantity,
  unitPrice,
  discountPct,
});

describe("money", () => {
  it("rounds half up to cents", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it("computes GST on the discounted subtotal", () => {
    const totals = documentTotals([line(8, 289, 5), line(1, 880), line(1, 1200)], 9);
    expect(totals.gross).toBe(4392);
    expect(totals.discount).toBe(115.6);
    expect(totals.subtotal).toBe(4276.4);
    expect(totals.gst).toBe(384.88);
    expect(totals.total).toBe(4661.28);
  });

  it("clamps silly discounts", () => {
    expect(documentTotals([line(1, 100, 150)], 9).subtotal).toBe(0);
    expect(documentTotals([line(1, 100, -10)], 9).subtotal).toBe(100);
  });
});

describe("invoice status", () => {
  const base: Invoice = {
    id: "i",
    number: "INV-1",
    customerId: "c",
    date: "2026-01-01",
    dueDate: "2026-01-31",
    status: "Issued",
    lines: [line(1, 100)],
    gstRate: 9,
    notes: "",
    reference: "",
    payments: [],
    source: null,
  };
  const pay = (amount: number) => ({ id: "p", date: "2026-01-10", amount, method: "PayNow" as const, reference: "" });

  it("derives unpaid / partial / paid / overdue", () => {
    expect(invoiceDisplayStatus(base, "2026-01-15")).toBe("Unpaid");
    expect(invoiceDisplayStatus({ ...base, payments: [pay(50)] }, "2026-01-15")).toBe("Partially Paid");
    expect(invoiceDisplayStatus({ ...base, payments: [pay(109)] }, "2026-03-01")).toBe("Paid");
    expect(invoiceDisplayStatus({ ...base, payments: [pay(50)] }, "2026-02-01")).toBe("Overdue");
    expect(invoiceDisplayStatus({ ...base, status: "Draft" }, "2026-03-01")).toBe("Draft");
    expect(invoiceDisplayStatus({ ...base, status: "Void" }, "2026-03-01")).toBe("Void");
  });
});

describe("misc helpers", () => {
  it("derives stock status", () => {
    const item = { currentStock: 5, minStock: 5, assignedTo: null } as InventoryItem;
    expect(stockStatus(item)).toBe("Low Stock");
    expect(stockStatus({ ...item, currentStock: 0 })).toBe("Out of Stock");
    expect(stockStatus({ ...item, currentStock: 6 })).toBe("In Stock");
    expect(stockStatus({ ...item, assignedTo: "Team A" })).toBe("Assigned");
  });

  it("handles dates and numbering", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(formatDocNumber("INV", 2026, 7)).toBe("INV-2026-0007");
  });

  it("measures attendance", () => {
    const rec = {
      id: "a",
      jobId: "j",
      technician: "t",
      checkIn: "2026-01-01T01:00:00.000Z",
      checkOut: "2026-01-01T03:15:00.000Z",
      checkInLocation: null,
      checkOutLocation: null,
      notes: "",
    };
    expect(attendanceHours(rec)).toBe(2.25);
    expect(formatHours(2.25)).toBe("2h 15m");
    expect(attendanceHours({ ...rec, checkOut: null }, new Date("2026-01-01T02:00:00.000Z"))).toBe(1);
  });

  it("escapes HTML and CSV", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
  });
});
