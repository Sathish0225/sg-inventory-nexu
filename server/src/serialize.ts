// Map database rows to the API shapes in src/types (numbers for money, ISO strings for dates).
import type { Prisma } from "@prisma/client";
import type {
  AttendanceRecord,
  CompanySettings,
  Customer,
  InventoryItem,
  Invoice,
  LineItem,
  Quotation,
  SalesOrder,
  ServiceJob,
  StockMovement,
} from "@/types";

type Dec = Prisma.Decimal | number;
const num = (d: Dec) => Number(d);
/** @db.Date columns come back as UTC midnight. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const toDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

interface LineRow {
  id: string;
  itemId: string | null;
  description: string;
  quantity: Dec;
  unitPrice: Dec;
  discountPct: Dec;
  position: number;
}

export const lines = (rows: LineRow[]): LineItem[] =>
  [...rows]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      itemId: l.itemId,
      description: l.description,
      quantity: num(l.quantity),
      unitPrice: num(l.unitPrice),
      discountPct: num(l.discountPct),
    }));

export const settings = (
  s: Prisma.SettingsGetPayload<object>,
  technicians: string[],
): CompanySettings => ({
  name: s.name,
  uen: s.uen,
  gstRegNo: s.gstRegNo,
  address: s.address,
  phone: s.phone,
  email: s.email,
  bankDetails: s.bankDetails,
  gstRate: num(s.gstRate),
  paymentTermsDays: s.paymentTermsDays,
  quotationValidityDays: s.quotationValidityDays,
  defaultLabourRate: num(s.defaultLabourRate),
  prefixes: s.prefixes as CompanySettings["prefixes"],
  technicians,
  quotationTerms: s.quotationTerms,
});

export const customer = (c: Prisma.CustomerGetPayload<object>): Customer => ({
  id: c.id,
  name: c.name,
  contactPerson: c.contactPerson,
  email: c.email,
  phone: c.phone,
  billingAddress: c.billingAddress,
  uen: c.uen,
  createdAt: c.createdAt.toISOString(),
});

export const inventoryItem = (i: Prisma.InventoryItemGetPayload<object>): InventoryItem => ({
  id: i.id,
  sku: i.sku,
  name: i.name,
  category: i.category as InventoryItem["category"],
  brand: i.brand,
  model: i.model,
  serialNumber: i.serialNumber,
  location: i.location,
  currentStock: num(i.currentStock),
  minStock: num(i.minStock),
  unitCost: num(i.unitCost),
  unitPrice: num(i.unitPrice),
  assignedTo: i.assignedTo,
  lastUpdated: isoDate(i.lastUpdated),
});

export const stockMovement = (m: Prisma.StockMovementGetPayload<object>): StockMovement & { itemName: string } => ({
  id: m.id,
  itemId: m.itemId ?? "",
  itemName: m.itemName,
  type: m.type as StockMovement["type"],
  quantity: num(m.quantity),
  reference: m.reference,
  note: m.note,
  at: m.at.toISOString(),
});

export const jobInclude = {
  customer: { select: { name: true } },
  parts: true,
  invoices: { where: { status: { not: "Void" } }, select: { id: true } },
} satisfies Prisma.ServiceJobInclude;

export const job = (j: Prisma.ServiceJobGetPayload<{ include: typeof jobInclude }>): ServiceJob => ({
  id: j.id,
  jobNumber: j.jobNumber,
  customerId: j.customerId,
  customer: j.customer.name,
  site: j.site,
  serviceType: j.serviceType as ServiceJob["serviceType"],
  technician: j.technician,
  dateScheduled: isoDate(j.dateScheduled),
  timeScheduled: j.timeScheduled,
  status: j.status as ServiceJob["status"],
  priority: j.priority as ServiceJob["priority"],
  description: j.description,
  partsUsed: [...j.parts]
    .sort((a, b) => a.position - b.position)
    .map((p) => ({ itemId: p.itemId, item: p.name, quantity: num(p.quantity), cost: num(p.cost) })),
  labourRate: num(j.labourRate),
  customerSignature: j.customerSignature,
  photos: j.photos,
  notes: j.notes,
  invoiceId: j.invoices[0]?.id ?? null,
  partsDeducted: j.partsDeducted,
});

export const attendance = (a: Prisma.AttendanceRecordGetPayload<object>): AttendanceRecord => ({
  id: a.id,
  jobId: a.jobId,
  technician: a.technician,
  checkIn: a.checkIn.toISOString(),
  checkOut: a.checkOut?.toISOString() ?? null,
  checkInLocation: a.checkInLat != null && a.checkInLng != null ? { lat: a.checkInLat, lng: a.checkInLng } : null,
  checkOutLocation: a.checkOutLat != null && a.checkOutLng != null ? { lat: a.checkOutLat, lng: a.checkOutLng } : null,
  notes: a.notes,
});

const liveInvoice = { where: { status: { not: "Void" } }, select: { id: true } } as const;

export const quotationInclude = {
  lines: true,
  salesOrder: { select: { id: true } },
  invoices: liveInvoice,
} satisfies Prisma.QuotationInclude;

export const quotation = (q: Prisma.QuotationGetPayload<{ include: typeof quotationInclude }>): Quotation => ({
  id: q.id,
  number: q.number,
  customerId: q.customerId,
  date: isoDate(q.date),
  validUntil: isoDate(q.validUntil),
  status: q.status as Quotation["status"],
  lines: lines(q.lines),
  gstRate: num(q.gstRate),
  notes: q.notes,
  reference: q.reference,
  terms: q.terms,
  salesOrderId: q.salesOrder?.id ?? null,
  invoiceId: q.invoices[0]?.id ?? null,
});

export const salesOrderInclude = { lines: true, invoices: liveInvoice } satisfies Prisma.SalesOrderInclude;

export const salesOrder = (o: Prisma.SalesOrderGetPayload<{ include: typeof salesOrderInclude }>): SalesOrder => ({
  id: o.id,
  number: o.number,
  customerId: o.customerId,
  date: isoDate(o.date),
  deliveryDate: isoDate(o.deliveryDate),
  status: o.status as SalesOrder["status"],
  lines: lines(o.lines),
  gstRate: num(o.gstRate),
  notes: o.notes,
  reference: o.reference,
  quotationId: o.quotationId,
  invoiceId: o.invoices[0]?.id ?? null,
  fulfilledAt: o.fulfilledAt?.toISOString() ?? null,
});

export const invoiceInclude = {
  lines: true,
  payments: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.InvoiceInclude;

export const invoice = (inv: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>): Invoice => ({
  id: inv.id,
  number: inv.number,
  customerId: inv.customerId,
  date: isoDate(inv.date),
  dueDate: isoDate(inv.dueDate),
  status: inv.status as Invoice["status"],
  lines: lines(inv.lines),
  gstRate: num(inv.gstRate),
  notes: inv.notes,
  reference: inv.reference,
  payments: inv.payments.map((p) => ({
    id: p.id,
    date: isoDate(p.date),
    amount: num(p.amount),
    method: p.method as Invoice["payments"][number]["method"],
    reference: p.reference,
  })),
  source: inv.quotationId
    ? { type: "quotation", id: inv.quotationId }
    : inv.salesOrderId
      ? { type: "salesOrder", id: inv.salesOrderId }
      : inv.serviceJobId
        ? { type: "serviceJob", id: inv.serviceJobId }
        : null,
});
