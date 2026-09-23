import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, attendanceHours, balanceDue, formatDocNumber, roundMoney, todayISO } from "@/lib/calc";
import { uid } from "@/lib/id";
import type {
  AttendanceRecord,
  CompanySettings,
  Customer,
  DocumentKind,
  GeoPoint,
  InventoryItem,
  Invoice,
  LineItem,
  Payment,
  Quotation,
  QuotationStatus,
  SalesOrder,
  ServiceJob,
  StockMovement,
} from "@/types";
import { buildSeed, defaultSettings } from "./seed";

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T,>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });

export type NewInventoryItem = Omit<InventoryItem, "id" | "lastUpdated">;
export type NewServiceJob = Omit<ServiceJob, "id" | "jobNumber" | "invoiceId" | "partsDeducted"> & { jobNumber?: string };
export type QuotationInput = Omit<Quotation, "id" | "number" | "salesOrderId" | "invoiceId">;
export type SalesOrderInput = Omit<SalesOrder, "id" | "number" | "invoiceId" | "fulfilledAt" | "quotationId"> & {
  quotationId?: string | null;
};
export type InvoiceInput = Omit<Invoice, "id" | "number" | "payments" | "source"> & { source?: Invoice["source"] };

interface DataState {
  settings: CompanySettings;
  customers: Customer[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  jobs: ServiceJob[];
  attendance: AttendanceRecord[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  counters: Record<DocumentKind, number>;
}

interface Actions {
  updateSettings: (patch: Partial<CompanySettings>) => void;
  resetDemoData: () => void;

  addCustomer: (input: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => Result;

  addInventoryItem: (input: NewInventoryItem) => InventoryItem;
  updateInventoryItem: (id: string, patch: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  /** Apply a signed stock change and record the movement. Refuses to go below zero. */
  adjustStock: (itemId: string, delta: number, reference: string, note?: string) => Result;

  addJob: (input: NewServiceJob) => ServiceJob;
  updateJob: (id: string, patch: Partial<ServiceJob>) => Result;
  deleteJob: (id: string) => Result;

  checkIn: (jobId: string, technician: string, location?: GeoPoint | null) => Result<AttendanceRecord>;
  checkOut: (recordId: string, notes?: string, location?: GeoPoint | null) => Result;
  deleteAttendance: (recordId: string) => void;

  createQuotation: (input: QuotationInput) => Quotation;
  updateQuotation: (id: string, patch: Partial<QuotationInput>) => Result;
  setQuotationStatus: (id: string, status: QuotationStatus) => Result;
  deleteQuotation: (id: string) => Result;
  convertQuotationToSalesOrder: (id: string) => Result<SalesOrder>;
  convertQuotationToInvoice: (id: string) => Result<Invoice>;

  createSalesOrder: (input: SalesOrderInput) => SalesOrder;
  updateSalesOrder: (id: string, patch: Partial<SalesOrderInput>) => Result;
  confirmSalesOrder: (id: string) => Result;
  fulfilSalesOrder: (id: string) => Result;
  cancelSalesOrder: (id: string) => Result;
  deleteSalesOrder: (id: string) => Result;
  convertSalesOrderToInvoice: (id: string) => Result<Invoice>;

  createInvoice: (input: InvoiceInput) => Invoice;
  updateInvoice: (id: string, patch: Partial<InvoiceInput>) => Result;
  issueInvoice: (id: string) => Result;
  voidInvoice: (id: string) => Result;
  deleteInvoice: (id: string) => Result;
  recordPayment: (invoiceId: string, payment: Omit<Payment, "id">) => Result;
  deletePayment: (invoiceId: string, paymentId: string) => void;
  createInvoiceFromJob: (jobId: string) => Result<Invoice>;
}

export type AppState = DataState & Actions;

const initialData = (): DataState => ({
  settings: defaultSettings,
  stockMovements: [],
  ...buildSeed(),
});

const copyLines = (lines: LineItem[]): LineItem[] => lines.map((l) => ({ ...l, id: uid() }));

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Reserve the next sequential document number for `kind`. */
      const nextNumber = (kind: DocumentKind): string => {
        const seq = get().counters[kind] + 1;
        set((s) => ({ counters: { ...s.counters, [kind]: seq } }));
        return formatDocNumber(get().settings.prefixes[kind], new Date().getFullYear(), seq);
      };

      const buildInvoice = (input: InvoiceInput): Invoice => ({
        ...input,
        id: uid(),
        number: nextNumber("invoice"),
        payments: [],
        source: input.source ?? null,
      });

      const invoiceDefaults = (customerId: string, lines: LineItem[], gstRate: number, reference: string) => {
        const today = todayISO();
        return {
          customerId,
          date: today,
          dueDate: addDays(today, get().settings.paymentTermsDays),
          status: "Draft" as const,
          lines: copyLines(lines),
          gstRate,
          notes: "",
          reference,
        };
      };

      return {
        ...initialData(),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        resetDemoData: () => set(initialData()),

        // ---------------------------------------------------------------- customers
        addCustomer: (input) => {
          const customer: Customer = { ...input, id: uid(), createdAt: new Date().toISOString() };
          set((s) => ({ customers: [...s.customers, customer] }));
          return customer;
        },
        updateCustomer: (id, patch) =>
          set((s) => ({
            customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch, id } : c)),
            // Jobs keep a denormalised name for display; keep it in sync on rename.
            jobs: patch.name ? s.jobs.map((j) => (j.customerId === id ? { ...j, customer: patch.name! } : j)) : s.jobs,
          })),
        deleteCustomer: (id) => {
          const s = get();
          const inUse =
            s.quotations.some((d) => d.customerId === id) ||
            s.salesOrders.some((d) => d.customerId === id) ||
            s.invoices.some((d) => d.customerId === id) ||
            s.jobs.some((j) => j.customerId === id);
          if (inUse) return fail("Customer has quotations, orders, invoices or jobs and cannot be deleted.");
          set({ customers: s.customers.filter((c) => c.id !== id) });
          return ok(undefined);
        },

        // ---------------------------------------------------------------- inventory
        addInventoryItem: (input) => {
          const item: InventoryItem = { ...input, id: uid(), lastUpdated: todayISO() };
          set((s) => ({ inventory: [...s.inventory, item] }));
          return item;
        },
        updateInventoryItem: (id, patch) =>
          set((s) => ({
            inventory: s.inventory.map((i) => (i.id === id ? { ...i, ...patch, id, lastUpdated: todayISO() } : i)),
          })),
        deleteInventoryItem: (id) => set((s) => ({ inventory: s.inventory.filter((i) => i.id !== id) })),
        adjustStock: (itemId, delta, reference, note = "") => {
          const item = get().inventory.find((i) => i.id === itemId);
          if (!item) return fail("Item not found.");
          if (!Number.isFinite(delta) || delta === 0) return fail("Quantity must be a non-zero number.");
          if (item.currentStock + delta < 0) {
            return fail(`Insufficient stock for ${item.name}: ${item.currentStock} available, ${-delta} required.`);
          }
          const movement: StockMovement = {
            id: uid(),
            itemId,
            type: delta > 0 ? "in" : "out",
            quantity: delta,
            reference,
            note,
            at: new Date().toISOString(),
          };
          set((s) => ({
            inventory: s.inventory.map((i) =>
              i.id === itemId ? { ...i, currentStock: i.currentStock + delta, lastUpdated: todayISO() } : i,
            ),
            stockMovements: [movement, ...s.stockMovements].slice(0, 500),
          }));
          return ok(undefined);
        },

        // ---------------------------------------------------------------- service jobs
        addJob: ({ jobNumber, ...input }) => {
          const job: ServiceJob = {
            ...input,
            id: uid(),
            jobNumber: jobNumber?.trim() || nextNumber("serviceJob"),
            invoiceId: null,
            partsDeducted: false,
          };
          set((s) => ({ jobs: [...s.jobs, job] }));
          return job;
        },
        updateJob: (id, patch) => {
          const job = get().jobs.find((j) => j.id === id);
          if (!job) return fail("Job not found.");
          if (job.partsDeducted && patch.partsUsed) {
            return fail("Parts were already deducted from stock when the job was completed.");
          }
          const completing = patch.status === "Completed" && job.status !== "Completed" && !job.partsDeducted;
          if (completing) {
            const parts = (patch.partsUsed ?? job.partsUsed).filter((p) => p.itemId);
            // Validate everything first so a shortage doesn't leave a partial deduction.
            for (const part of parts) {
              const item = get().inventory.find((i) => i.id === part.itemId);
              if (item && item.currentStock < part.quantity) {
                return fail(`Insufficient stock for ${item.name}: ${item.currentStock} available, ${part.quantity} used.`);
              }
            }
            for (const part of parts) {
              if (get().inventory.some((i) => i.id === part.itemId)) {
                get().adjustStock(part.itemId!, -part.quantity, job.jobNumber, "Used on service job");
              }
            }
          }
          set((s) => ({
            jobs: s.jobs.map((j) =>
              j.id === id ? { ...j, ...patch, id, partsDeducted: j.partsDeducted || completing } : j,
            ),
          }));
          return ok(undefined);
        },
        deleteJob: (id) => {
          const job = get().jobs.find((j) => j.id === id);
          if (job?.invoiceId) return fail("This job has been invoiced and cannot be deleted.");
          set((s) => ({
            jobs: s.jobs.filter((j) => j.id !== id),
            attendance: s.attendance.filter((a) => a.jobId !== id),
          }));
          return ok(undefined);
        },

        // ---------------------------------------------------------------- attendance
        checkIn: (jobId, technician, location = null) => {
          const s = get();
          const job = s.jobs.find((j) => j.id === jobId);
          if (!job) return fail("Job not found.");
          if (job.status === "Completed" || job.status === "Cancelled") {
            return fail(`Job ${job.jobNumber} is ${job.status.toLowerCase()}.`);
          }
          const open = s.attendance.find((a) => a.technician === technician && !a.checkOut);
          if (open) {
            const openJob = s.jobs.find((j) => j.id === open.jobId);
            return fail(`${technician} is still checked in to ${openJob?.jobNumber ?? "another job"}. Check out first.`);
          }
          const record: AttendanceRecord = {
            id: uid(),
            jobId,
            technician,
            checkIn: new Date().toISOString(),
            checkOut: null,
            checkInLocation: location,
            checkOutLocation: null,
            notes: "",
          };
          set((st) => ({
            attendance: [record, ...st.attendance],
            jobs: st.jobs.map((j) => (j.id === jobId && j.status === "Scheduled" ? { ...j, status: "In Progress" } : j)),
          }));
          return ok(record);
        },
        checkOut: (recordId, notes = "", location = null) => {
          const record = get().attendance.find((a) => a.id === recordId);
          if (!record) return fail("Attendance record not found.");
          if (record.checkOut) return fail("Already checked out.");
          set((s) => ({
            attendance: s.attendance.map((a) =>
              a.id === recordId
                ? { ...a, checkOut: new Date().toISOString(), checkOutLocation: location, notes: notes || a.notes }
                : a,
            ),
          }));
          return ok(undefined);
        },
        deleteAttendance: (recordId) => set((s) => ({ attendance: s.attendance.filter((a) => a.id !== recordId) })),

        // ---------------------------------------------------------------- quotations
        createQuotation: (input) => {
          const quotation: Quotation = { ...input, id: uid(), number: nextNumber("quotation"), salesOrderId: null, invoiceId: null };
          set((s) => ({ quotations: [...s.quotations, quotation] }));
          return quotation;
        },
        updateQuotation: (id, patch) => {
          const q = get().quotations.find((x) => x.id === id);
          if (!q) return fail("Quotation not found.");
          if (q.salesOrderId || q.invoiceId) return fail("Converted quotations cannot be edited.");
          set((s) => ({ quotations: s.quotations.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          return ok(undefined);
        },
        setQuotationStatus: (id, status) => {
          const q = get().quotations.find((x) => x.id === id);
          if (!q) return fail("Quotation not found.");
          if ((q.salesOrderId || q.invoiceId) && status !== "Accepted") {
            return fail("Converted quotations must stay accepted.");
          }
          set((s) => ({ quotations: s.quotations.map((x) => (x.id === id ? { ...x, status } : x)) }));
          return ok(undefined);
        },
        deleteQuotation: (id) => {
          const q = get().quotations.find((x) => x.id === id);
          if (q?.salesOrderId || q?.invoiceId) return fail("Converted quotations cannot be deleted.");
          set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) }));
          return ok(undefined);
        },
        convertQuotationToSalesOrder: (id) => {
          const q = get().quotations.find((x) => x.id === id);
          if (!q) return fail("Quotation not found.");
          if (q.salesOrderId || q.invoiceId) return fail(`${q.number} has already been converted.`);
          if (q.status === "Rejected" || q.status === "Expired") return fail(`${q.number} is ${q.status.toLowerCase()}.`);
          const today = todayISO();
          const order = get().createSalesOrder({
            customerId: q.customerId,
            date: today,
            deliveryDate: addDays(today, 7),
            status: "Pending",
            lines: copyLines(q.lines),
            gstRate: q.gstRate,
            notes: q.notes,
            reference: q.reference || q.number,
            quotationId: q.id,
          });
          set((s) => ({
            quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: "Accepted", salesOrderId: order.id } : x)),
          }));
          return ok(order);
        },
        convertQuotationToInvoice: (id) => {
          const q = get().quotations.find((x) => x.id === id);
          if (!q) return fail("Quotation not found.");
          if (q.salesOrderId || q.invoiceId) return fail(`${q.number} has already been converted.`);
          if (q.status === "Rejected" || q.status === "Expired") return fail(`${q.number} is ${q.status.toLowerCase()}.`);
          const invoice = buildInvoice({
            ...invoiceDefaults(q.customerId, q.lines, q.gstRate, q.reference || q.number),
            source: { type: "quotation", id: q.id },
          });
          set((s) => ({
            invoices: [...s.invoices, invoice],
            quotations: s.quotations.map((x) => (x.id === id ? { ...x, status: "Accepted", invoiceId: invoice.id } : x)),
          }));
          return ok(invoice);
        },

        // ---------------------------------------------------------------- sales orders
        createSalesOrder: (input) => {
          const order: SalesOrder = {
            ...input,
            id: uid(),
            number: nextNumber("salesOrder"),
            quotationId: input.quotationId ?? null,
            invoiceId: null,
            fulfilledAt: null,
          };
          set((s) => ({ salesOrders: [...s.salesOrders, order] }));
          return order;
        },
        updateSalesOrder: (id, patch) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.status === "Fulfilled" || o.status === "Cancelled") return fail(`${o.status} orders cannot be edited.`);
          set((s) => ({ salesOrders: s.salesOrders.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          return ok(undefined);
        },
        confirmSalesOrder: (id) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.status !== "Pending") return fail(`Only pending orders can be confirmed.`);
          set((s) => ({ salesOrders: s.salesOrders.map((x) => (x.id === id ? { ...x, status: "Confirmed" } : x)) }));
          return ok(undefined);
        },
        fulfilSalesOrder: (id) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.status === "Fulfilled" || o.status === "Cancelled") return fail(`Order is already ${o.status.toLowerCase()}.`);
          // Aggregate per item so two lines of the same product are checked together.
          const needed = new Map<string, number>();
          for (const line of o.lines) {
            if (line.itemId) needed.set(line.itemId, (needed.get(line.itemId) ?? 0) + line.quantity);
          }
          for (const [itemId, qty] of needed) {
            const item = get().inventory.find((i) => i.id === itemId);
            if (item && item.currentStock < qty) {
              return fail(`Insufficient stock for ${item.name}: ${item.currentStock} available, ${qty} ordered.`);
            }
          }
          for (const [itemId, qty] of needed) {
            if (get().inventory.some((i) => i.id === itemId)) get().adjustStock(itemId, -qty, o.number, "Sales order fulfilment");
          }
          set((s) => ({
            salesOrders: s.salesOrders.map((x) =>
              x.id === id ? { ...x, status: "Fulfilled", fulfilledAt: new Date().toISOString() } : x,
            ),
          }));
          return ok(undefined);
        },
        cancelSalesOrder: (id) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.status === "Fulfilled") return fail("Fulfilled orders cannot be cancelled. Issue a credit instead.");
          if (o.invoiceId) return fail("Void the linked invoice before cancelling this order.");
          set((s) => ({ salesOrders: s.salesOrders.map((x) => (x.id === id ? { ...x, status: "Cancelled" } : x)) }));
          return ok(undefined);
        },
        deleteSalesOrder: (id) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.status === "Fulfilled" || o.invoiceId) return fail("Fulfilled or invoiced orders cannot be deleted.");
          set((s) => ({
            salesOrders: s.salesOrders.filter((x) => x.id !== id),
            // Release the quotation so it can be converted again.
            quotations: s.quotations.map((q) => (q.salesOrderId === id ? { ...q, salesOrderId: null } : q)),
          }));
          return ok(undefined);
        },
        convertSalesOrderToInvoice: (id) => {
          const o = get().salesOrders.find((x) => x.id === id);
          if (!o) return fail("Sales order not found.");
          if (o.invoiceId) return fail(`${o.number} has already been invoiced.`);
          if (o.status === "Cancelled") return fail("Cancelled orders cannot be invoiced.");
          const invoice = buildInvoice({
            ...invoiceDefaults(o.customerId, o.lines, o.gstRate, o.reference || o.number),
            source: { type: "salesOrder", id: o.id },
          });
          set((s) => ({
            invoices: [...s.invoices, invoice],
            salesOrders: s.salesOrders.map((x) => (x.id === id ? { ...x, invoiceId: invoice.id } : x)),
          }));
          return ok(invoice);
        },

        // ---------------------------------------------------------------- invoices
        createInvoice: (input) => {
          const invoice = buildInvoice(input);
          set((s) => ({ invoices: [...s.invoices, invoice] }));
          return invoice;
        },
        updateInvoice: (id, patch) => {
          const inv = get().invoices.find((x) => x.id === id);
          if (!inv) return fail("Invoice not found.");
          if (inv.status !== "Draft") return fail("Only draft invoices can be edited. Void and re-issue instead.");
          set((s) => ({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          return ok(undefined);
        },
        issueInvoice: (id) => {
          const inv = get().invoices.find((x) => x.id === id);
          if (!inv) return fail("Invoice not found.");
          if (inv.status !== "Draft") return fail("Invoice has already been issued.");
          if (inv.lines.length === 0) return fail("Add at least one line before issuing.");
          set((s) => ({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "Issued" } : x)) }));
          return ok(undefined);
        },
        voidInvoice: (id) => {
          const inv = get().invoices.find((x) => x.id === id);
          if (!inv) return fail("Invoice not found.");
          if (inv.status === "Void") return fail("Invoice is already void.");
          if (inv.payments.length > 0) return fail("Remove recorded payments before voiding.");
          set((s) => ({
            invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "Void" } : x)),
            // Unlink so the source document can be invoiced again.
            quotations: s.quotations.map((q) => (q.invoiceId === id ? { ...q, invoiceId: null } : q)),
            salesOrders: s.salesOrders.map((o) => (o.invoiceId === id ? { ...o, invoiceId: null } : o)),
            jobs: s.jobs.map((j) => (j.invoiceId === id ? { ...j, invoiceId: null } : j)),
          }));
          return ok(undefined);
        },
        deleteInvoice: (id) => {
          const inv = get().invoices.find((x) => x.id === id);
          if (!inv) return fail("Invoice not found.");
          // Issued tax invoices must be kept for audit (IRAS requires 5 years); void them instead.
          if (inv.status !== "Draft") return fail("Only draft invoices can be deleted. Void issued invoices instead.");
          set((s) => ({
            invoices: s.invoices.filter((x) => x.id !== id),
            quotations: s.quotations.map((q) => (q.invoiceId === id ? { ...q, invoiceId: null } : q)),
            salesOrders: s.salesOrders.map((o) => (o.invoiceId === id ? { ...o, invoiceId: null } : o)),
            jobs: s.jobs.map((j) => (j.invoiceId === id ? { ...j, invoiceId: null } : j)),
          }));
          return ok(undefined);
        },
        recordPayment: (invoiceId, payment) => {
          const inv = get().invoices.find((x) => x.id === invoiceId);
          if (!inv) return fail("Invoice not found.");
          if (inv.status !== "Issued") return fail("Payments can only be recorded against issued invoices.");
          const amount = roundMoney(payment.amount);
          if (!(amount > 0)) return fail("Payment amount must be greater than zero.");
          const balance = balanceDue(inv);
          if (amount > balance) return fail(`Payment exceeds the balance due (S$${balance.toFixed(2)}).`);
          set((s) => ({
            invoices: s.invoices.map((x) =>
              x.id === invoiceId ? { ...x, payments: [...x.payments, { ...payment, amount, id: uid() }] } : x,
            ),
          }));
          return ok(undefined);
        },
        deletePayment: (invoiceId, paymentId) =>
          set((s) => ({
            invoices: s.invoices.map((x) =>
              x.id === invoiceId ? { ...x, payments: x.payments.filter((p) => p.id !== paymentId) } : x,
            ),
          })),
        createInvoiceFromJob: (jobId) => {
          const s = get();
          const job = s.jobs.find((j) => j.id === jobId);
          if (!job) return fail("Job not found.");
          if (job.invoiceId) return fail(`${job.jobNumber} has already been invoiced.`);
          if (!job.customerId) return fail("Link this job to a customer record before invoicing.");
          const hours = roundMoney(
            s.attendance.filter((a) => a.jobId === jobId && a.checkOut).reduce((sum, a) => sum + attendanceHours(a), 0),
          );
          const lines: LineItem[] = job.partsUsed.map((p) => ({
            id: uid(),
            itemId: p.itemId,
            description: p.item,
            quantity: p.quantity,
            unitPrice: p.cost,
            discountPct: 0,
          }));
          if (hours > 0) {
            lines.push({
              id: uid(),
              itemId: null,
              description: `Labour - ${job.serviceType} (${job.site})`,
              quantity: hours,
              unitPrice: job.labourRate,
              discountPct: 0,
            });
          }
          if (lines.length === 0) {
            return fail("Nothing to bill: no parts recorded and no completed attendance for this job.");
          }
          const invoice = buildInvoice({
            ...invoiceDefaults(job.customerId, lines, s.settings.gstRate, job.jobNumber),
            notes: job.description,
            source: { type: "serviceJob", id: job.id },
          });
          set((st) => ({
            invoices: [...st.invoices, invoice],
            jobs: st.jobs.map((j) => (j.id === jobId ? { ...j, invoiceId: invoice.id } : j)),
          }));
          return ok(invoice);
        },
      };
    },
    {
      name: "inventrack-sg",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Persist data only; actions are recreated on load.
      partialize: (state): DataState => ({
        settings: state.settings,
        customers: state.customers,
        inventory: state.inventory,
        stockMovements: state.stockMovements,
        jobs: state.jobs,
        attendance: state.attendance,
        quotations: state.quotations,
        salesOrders: state.salesOrders,
        invoices: state.invoices,
        counters: state.counters,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DataState>;
        // Merge settings key-by-key so new settings fields get defaults after an upgrade.
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
    },
  ),
);

export const selectCustomerName = (customers: Customer[], id: string | null) =>
  customers.find((c) => c.id === id)?.name ?? "Unknown customer";
