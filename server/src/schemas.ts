import { z } from "zod";
import { roles } from "@/lib/permissions";

// Request body schemas. Strings are trimmed and capped so a bad client can't store megabytes of text.

const text = (max = 500) => z.string().trim().max(max);
const optionalText = (max = 500) => text(max).default("");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a date (YYYY-MM-DD)");
const money = z.number().finite().min(0).max(1e10);
const quantity = z.number().finite().min(0).max(1e9);
const id = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
  /** "app" for the mobile / desktop apps, which use bearer tokens instead of cookies. */
  client: z.enum(["web", "app"]).default("web"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, "Password must be at least 10 characters").max(200),
});

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: text(120).min(1),
  role: z.enum(roles),
  password: z.string().min(10, "Password must be at least 10 characters").max(200),
});

export const userUpdateSchema = z
  .object({
    name: text(120).min(1),
    role: z.enum(roles),
    active: z.boolean(),
    password: z.string().min(10, "Password must be at least 10 characters").max(200),
  })
  .partial();

export const settingsSchema = z.object({
  name: text(200).min(1),
  uen: optionalText(40),
  gstRegNo: optionalText(40),
  address: optionalText(500),
  phone: optionalText(60),
  email: optionalText(200),
  bankDetails: optionalText(500),
  gstRate: z.number().min(0).max(100),
  paymentTermsDays: z.number().int().min(0).max(365),
  quotationValidityDays: z.number().int().min(1).max(365),
  defaultLabourRate: money,
  prefixes: z.object({
    quotation: text(8).min(1),
    salesOrder: text(8).min(1),
    invoice: text(8).min(1),
    serviceJob: text(8).min(1),
  }),
  quotationTerms: optionalText(4000),
});

export const customerSchema = z.object({
  name: text(200).min(1),
  contactPerson: optionalText(120),
  email: optionalText(200),
  phone: optionalText(60),
  billingAddress: optionalText(500),
  uen: optionalText(40),
});

export const inventoryCategories = ["Electronics", "Lighting", "Security", "Networking", "HVAC", "Other"] as const;

export const inventoryCreateSchema = z.object({
  sku: text(60).min(1),
  name: text(200).min(1),
  category: z.enum(inventoryCategories),
  brand: optionalText(120),
  model: optionalText(120),
  serialNumber: optionalText(120),
  location: optionalText(200),
  currentStock: quantity.default(0),
  minStock: quantity.default(0),
  unitCost: money.default(0),
  unitPrice: money.default(0),
  assignedTo: text(120).nullable().default(null),
});
// Stock only changes through recorded movements, never through a plain edit.
export const inventoryUpdateSchema = inventoryCreateSchema.omit({ currentStock: true }).partial();

export const stockAdjustSchema = z.object({
  delta: z.number().finite().refine((n) => n !== 0, "Quantity must be non-zero"),
  reference: optionalText(120),
  note: optionalText(500),
});

export const jobStatuses = ["Scheduled", "In Progress", "Completed", "Cancelled"] as const;
const partSchema = z.object({
  itemId: id.nullable(),
  item: text(200).min(1),
  quantity: quantity.refine((n) => n > 0, "Quantity must be positive"),
  cost: money,
});

export const jobCreateSchema = z.object({
  jobNumber: text(40).optional(),
  customerId: id,
  site: text(200).min(1),
  serviceType: z.enum(["Preventive Maintenance", "Corrective Maintenance", "Installation", "Emergency Repair"]),
  technician: text(120).min(1),
  dateScheduled: isoDate,
  timeScheduled: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(jobStatuses).default("Scheduled"),
  priority: z.enum(["Low", "Medium", "High"]),
  description: text(2000).min(1),
  partsUsed: z.array(partSchema).max(200).default([]),
  labourRate: money.default(0),
  customerSignature: z.boolean().default(false),
  photos: z.number().int().min(0).max(1000).default(0),
  notes: optionalText(4000),
});
export const jobUpdateSchema = jobCreateSchema.omit({ jobNumber: true }).partial();

const geo = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).nullable().default(null);

export const checkInSchema = z.object({ jobId: id, technician: text(120).min(1), location: geo });
export const checkOutSchema = z.object({ notes: optionalText(4000), location: geo });

const lineSchema = z.object({
  itemId: id.nullable(),
  description: text(500).min(1),
  quantity: quantity.refine((n) => n > 0, "Quantity must be positive"),
  unitPrice: money,
  discountPct: z.number().min(0).max(100).default(0),
});

const documentBase = {
  customerId: id,
  date: isoDate,
  lines: z.array(lineSchema).max(500),
  gstRate: z.number().min(0).max(100),
  notes: optionalText(4000),
  reference: optionalText(200),
};

export const quotationStatuses = ["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const;
export const quotationCreateSchema = z.object({
  ...documentBase,
  validUntil: isoDate,
  terms: optionalText(4000),
  status: z.enum(quotationStatuses).default("Draft"),
});
export const quotationUpdateSchema = quotationCreateSchema.omit({ status: true }).partial();
export const quotationStatusSchema = z.object({ status: z.enum(quotationStatuses) });

export const salesOrderCreateSchema = z.object({ ...documentBase, deliveryDate: isoDate });
export const salesOrderUpdateSchema = salesOrderCreateSchema.partial();

export const invoiceCreateSchema = z.object({ ...documentBase, dueDate: isoDate });
export const invoiceUpdateSchema = invoiceCreateSchema.partial();

export const paymentSchema = z.object({
  date: isoDate,
  amount: z.number().finite().positive().max(1e10),
  method: z.enum(["Bank Transfer", "PayNow", "Cheque", "Cash", "Credit Card"]),
  reference: optionalText(120),
});

export type LineInput = z.infer<typeof lineSchema>;
export type PartInput = z.infer<typeof partSchema>;
