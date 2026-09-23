import type {
  AttendanceRecord,
  Invoice,
  InvoiceDisplayStatus,
  InventoryItem,
  LineItem,
  ServiceJob,
} from "@/types";

/** Round to cents, avoiding binary floating point drift (e.g. 1.005 -> 1.01). */
export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const amountFormatter = new Intl.NumberFormat("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Always "S$" – the en-SG locale renders plain "$", which is ambiguous on customer documents. */
export const formatSGD = (value: number): string => {
  const rounded = roundMoney(value);
  return `${rounded < 0 ? "-" : ""}S$${amountFormatter.format(Math.abs(rounded))}`;
};

/** Short axis ticks: S$0, S$500, S$2.5K, S$1.2M. */
export const formatSGDAxis = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `S$${Number((value / 1_000_000).toFixed(1))}M`;
  if (abs >= 1_000) return `S$${Number((value / 1_000).toFixed(1))}K`;
  return `S$${Math.round(value)}`;
};

/** Compact form for dashboard tiles: S$1.2K, S$3.4M. */
export const formatSGDCompact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `S$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `S$${(value / 1_000).toFixed(1)}K`;
  return `S$${roundMoney(value).toFixed(2)}`;
};

export const lineGross = (line: Pick<LineItem, "quantity" | "unitPrice">): number =>
  roundMoney(line.quantity * line.unitPrice);

export const lineDiscount = (line: LineItem): number =>
  roundMoney((lineGross(line) * clamp(line.discountPct, 0, 100)) / 100);

export const lineNet = (line: LineItem): number => roundMoney(lineGross(line) - lineDiscount(line));

export interface DocumentTotals {
  gross: number;
  discount: number;
  subtotal: number;
  gst: number;
  total: number;
}

/** GST is computed once on the net subtotal, as IRAS requires for tax invoices. */
export const documentTotals = (lines: LineItem[], gstRate: number): DocumentTotals => {
  const gross = roundMoney(lines.reduce((sum, l) => sum + lineGross(l), 0));
  const discount = roundMoney(lines.reduce((sum, l) => sum + lineDiscount(l), 0));
  const subtotal = roundMoney(gross - discount);
  const gst = roundMoney((subtotal * gstRate) / 100);
  return { gross, discount, subtotal, gst, total: roundMoney(subtotal + gst) };
};

export const amountPaid = (invoice: Pick<Invoice, "payments">): number =>
  roundMoney(invoice.payments.reduce((sum, p) => sum + p.amount, 0));

export const invoiceTotal = (invoice: Pick<Invoice, "lines" | "gstRate">): number =>
  documentTotals(invoice.lines, invoice.gstRate).total;

export const balanceDue = (invoice: Pick<Invoice, "lines" | "gstRate" | "payments">): number =>
  roundMoney(invoiceTotal(invoice) - amountPaid(invoice));

export const invoiceDisplayStatus = (invoice: Invoice, today: string = todayISO()): InvoiceDisplayStatus => {
  if (invoice.status === "Void") return "Void";
  if (invoice.status === "Draft") return "Draft";
  const balance = balanceDue(invoice);
  if (balance <= 0) return "Paid";
  if (invoice.dueDate < today) return "Overdue";
  return amountPaid(invoice) > 0 ? "Partially Paid" : "Unpaid";
};

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock" | "Assigned";

export const stockStatus = (item: InventoryItem): StockStatus => {
  if (item.assignedTo) return "Assigned";
  if (item.currentStock <= 0) return "Out of Stock";
  if (item.currentStock <= item.minStock) return "Low Stock";
  return "In Stock";
};

export const partsTotal = (job: Pick<ServiceJob, "partsUsed">): number =>
  roundMoney(job.partsUsed.reduce((sum, p) => sum + p.quantity * p.cost, 0));

/** Duration of an attendance record in hours; open records count up to `now`. */
export const attendanceHours = (record: AttendanceRecord, now: Date = new Date()): number => {
  const start = new Date(record.checkIn).getTime();
  const end = record.checkOut ? new Date(record.checkOut).getTime() : now.getTime();
  return Math.max(0, (end - start) / 3_600_000);
};

export const formatHours = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

export const todayISO = (date: Date = new Date()): string => {
  // Local calendar date (the app is used in SGT), not the UTC date from toISOString().
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const addDays = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
};

export const formatDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatDocNumber = (prefix: string, year: number, seq: number): string =>
  `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}
