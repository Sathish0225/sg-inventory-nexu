// Domain model shared by every module. All money values are SGD, stored as numbers
// (dollars) and rounded to cents by helpers in `@/lib/calc`.

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO timestamp

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  billingAddress: string;
  uen: string;
  createdAt: ISODateTime;
}

export type InventoryCategory = "Electronics" | "Lighting" | "Security" | "Networking" | "HVAC" | "Other";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
  currentStock: number;
  minStock: number;
  /** Purchase cost per unit. */
  unitCost: number;
  /** Default selling price per unit, used on quotations / invoices. */
  unitPrice: number;
  assignedTo: string | null;
  lastUpdated: ISODate;
}

export type StockMovementType = "in" | "out" | "adjust";

export interface StockMovement {
  id: string;
  itemId: string;
  type: StockMovementType;
  /** Signed change applied to currentStock. */
  quantity: number;
  reference: string;
  note: string;
  at: ISODateTime;
}

export type JobStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";
export type JobPriority = "Low" | "Medium" | "High";
export type ServiceType = "Preventive Maintenance" | "Corrective Maintenance" | "Installation" | "Emergency Repair";

export interface PartUsed {
  itemId: string | null;
  item: string;
  quantity: number;
  /** Price charged per unit. */
  cost: number;
}

export interface ServiceJob {
  id: string;
  jobNumber: string;
  customerId: string | null;
  customer: string;
  site: string;
  serviceType: ServiceType;
  technician: string;
  dateScheduled: ISODate;
  timeScheduled: string;
  status: JobStatus;
  priority: JobPriority;
  description: string;
  partsUsed: PartUsed[];
  /** Hourly labour rate charged when invoicing attended hours. */
  labourRate: number;
  customerSignature: boolean;
  photos: number;
  notes: string;
  invoiceId: string | null;
  /** True once parts linked to inventory have been deducted from stock (on completion). */
  partsDeducted: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AttendanceRecord {
  id: string;
  jobId: string;
  technician: string;
  checkIn: ISODateTime;
  checkOut: ISODateTime | null;
  checkInLocation: GeoPoint | null;
  checkOutLocation: GeoPoint | null;
  notes: string;
}

export interface LineItem {
  id: string;
  itemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Percentage 0-100 applied to this line. */
  discountPct: number;
}

interface CommercialDocument {
  id: string;
  number: string;
  customerId: string;
  date: ISODate;
  lines: LineItem[];
  /** GST rate (percent) captured when the document was created. */
  gstRate: number;
  notes: string;
  reference: string;
}

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

export interface Quotation extends CommercialDocument {
  validUntil: ISODate;
  status: QuotationStatus;
  terms: string;
  salesOrderId: string | null;
  invoiceId: string | null;
}

export type SalesOrderStatus = "Pending" | "Confirmed" | "Fulfilled" | "Cancelled";

export interface SalesOrder extends CommercialDocument {
  status: SalesOrderStatus;
  deliveryDate: ISODate;
  quotationId: string | null;
  invoiceId: string | null;
  fulfilledAt: ISODateTime | null;
}

export type InvoiceStatus = "Draft" | "Issued" | "Void";
/** Status shown to users – combines the stored status with payments and due date. */
export type InvoiceDisplayStatus = "Draft" | "Unpaid" | "Partially Paid" | "Paid" | "Overdue" | "Void";
export type PaymentMethod = "Bank Transfer" | "PayNow" | "Cheque" | "Cash" | "Credit Card";

export interface Payment {
  id: string;
  date: ISODate;
  amount: number;
  method: PaymentMethod;
  reference: string;
}

export type InvoiceSource =
  | { type: "quotation"; id: string }
  | { type: "salesOrder"; id: string }
  | { type: "serviceJob"; id: string }
  | null;

export interface Invoice extends CommercialDocument {
  dueDate: ISODate;
  status: InvoiceStatus;
  payments: Payment[];
  source: InvoiceSource;
}

export type DocumentKind = "quotation" | "salesOrder" | "invoice" | "serviceJob";

export interface CompanySettings {
  name: string;
  uen: string;
  gstRegNo: string;
  address: string;
  phone: string;
  email: string;
  bankDetails: string;
  gstRate: number;
  paymentTermsDays: number;
  quotationValidityDays: number;
  defaultLabourRate: number;
  prefixes: Record<DocumentKind, string>;
  technicians: string[];
  quotationTerms: string;
}

