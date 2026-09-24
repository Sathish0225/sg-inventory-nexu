import { create } from "zustand";
import { ApiError, api, configureApi, probeServer } from "@/lib/api";
import { appStorage, isApp, normaliseServerUrl } from "@/lib/platform";
import { can, type Permission, type Role } from "@/lib/permissions";
import type {
  AttendanceRecord,
  CompanySettings,
  Customer,
  GeoPoint,
  InventoryItem,
  Invoice,
  Payment,
  Quotation,
  QuotationStatus,
  SalesOrder,
  ServiceJob,
  StockMovement,
} from "@/types";

// Client-side cache of server data. Every mutation goes to the API (where the business rules
// live) and then re-fetches the collections it can affect, so screens always show saved state.

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AppUser extends SessionUser {
  active: boolean;
  createdAt: string;
}

export type NewInventoryItem = Omit<InventoryItem, "id" | "lastUpdated">;
export type NewServiceJob = Omit<ServiceJob, "id" | "jobNumber" | "invoiceId" | "partsDeducted" | "customer" | "customerId"> & {
  jobNumber?: string;
  customerId: string | null;
  customer?: string;
};
export type QuotationInput = Omit<Quotation, "id" | "number" | "salesOrderId" | "invoiceId">;
export type SalesOrderInput = Omit<SalesOrder, "id" | "number" | "invoiceId" | "fulfilledAt" | "quotationId" | "status">;
export type InvoiceInput = Omit<Invoice, "id" | "number" | "payments" | "source" | "status">;

type Collections = {
  customers: Customer[];
  inventory: InventoryItem[];
  stockMovements: (StockMovement & { itemName: string })[];
  jobs: ServiceJob[];
  attendance: AttendanceRecord[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  users: AppUser[];
};
type Key = keyof Collections | "settings";

const sources: Record<Key, { path: string; permission?: Permission }> = {
  settings: { path: "/settings" },
  customers: { path: "/customers", permission: "customers:read" },
  inventory: { path: "/inventory", permission: "inventory:read" },
  stockMovements: { path: "/stock-movements?limit=200", permission: "inventory:read" },
  jobs: { path: "/jobs", permission: "jobs:read" },
  // Technicians get their own visits from the same endpoint.
  attendance: { path: "/attendance" },
  quotations: { path: "/quotations", permission: "sales:read" },
  salesOrders: { path: "/sales-orders", permission: "sales:read" },
  invoices: { path: "/invoices", permission: "invoices:read" },
  users: { path: "/users", permission: "users:manage" },
};
const allKeys = Object.keys(sources) as Key[];

/** App storage keys. */
export const SERVER_KEY = "serverUrl";
const TOKEN_KEY = "authToken";

const emptySettings: CompanySettings = {
  name: "",
  uen: "",
  gstRegNo: "",
  address: "",
  phone: "",
  email: "",
  bankDetails: "",
  gstRate: 9,
  paymentTermsDays: 30,
  quotationValidityDays: 30,
  defaultLabourRate: 0,
  prefixes: { quotation: "QT", salesOrder: "SO", invoice: "INV", serviceJob: "JOB" },
  technicians: [],
  quotationTerms: "",
};

const emptyCollections = (): Collections => ({
  customers: [],
  inventory: [],
  stockMovements: [],
  jobs: [],
  attendance: [],
  quotations: [],
  salesOrders: [],
  invoices: [],
  users: [],
});

interface State extends Collections {
  status: "checking" | "signed-out" | "loading" | "ready" | "unreachable";
  /** Why the app couldn't reach its server (apps only). */
  connectionError: string | null;
  /** Apps: show the (normally hidden) server field on the login page. */
  serverChangeRequested: boolean;
  user: SessionUser | null;
  settings: CompanySettings;
}

interface Actions {
  /** Restore an existing session on page load. */
  bootstrap: () => Promise<void>;
  /** `server` is required in the desktop / mobile apps (the company server address). */
  login: (email: string, password: string, server?: string) => Promise<Result>;
  logout: () => Promise<void>;
  /** Apps: sign out and open the login page with the server field showing. */
  switchServer: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  /** Re-fetch collections (all readable ones when no keys are given). */
  refresh: (...keys: Key[]) => Promise<void>;

  updateSettings: (settings: Omit<CompanySettings, "technicians">) => Promise<Result>;

  createUser: (input: { email: string; name: string; role: Role; password: string }) => Promise<Result>;
  updateUser: (id: string, patch: Partial<{ name: string; role: Role; active: boolean; password: string }>) => Promise<Result>;

  addCustomer: (input: Omit<Customer, "id" | "createdAt">) => Promise<Result<Customer>>;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id" | "createdAt">>) => Promise<Result>;
  deleteCustomer: (id: string) => Promise<Result>;

  addInventoryItem: (input: NewInventoryItem) => Promise<Result>;
  updateInventoryItem: (id: string, patch: Partial<Omit<NewInventoryItem, "currentStock">>) => Promise<Result>;
  deleteInventoryItem: (id: string) => Promise<Result>;
  adjustStock: (itemId: string, delta: number, reference: string, note?: string) => Promise<Result>;

  addJob: (input: NewServiceJob) => Promise<Result<ServiceJob>>;
  updateJob: (id: string, patch: Partial<NewServiceJob>) => Promise<Result>;
  deleteJob: (id: string) => Promise<Result>;
  createInvoiceFromJob: (jobId: string) => Promise<Result<Invoice>>;

  checkIn: (jobId: string, technician: string, location?: GeoPoint | null) => Promise<Result<AttendanceRecord>>;
  checkOut: (recordId: string, notes?: string, location?: GeoPoint | null) => Promise<Result>;
  deleteAttendance: (recordId: string) => Promise<Result>;

  createQuotation: (input: QuotationInput) => Promise<Result<Quotation>>;
  updateQuotation: (id: string, patch: Partial<QuotationInput>) => Promise<Result>;
  setQuotationStatus: (id: string, status: QuotationStatus) => Promise<Result>;
  deleteQuotation: (id: string) => Promise<Result>;
  convertQuotationToSalesOrder: (id: string) => Promise<Result<SalesOrder>>;
  convertQuotationToInvoice: (id: string) => Promise<Result<Invoice>>;

  createSalesOrder: (input: SalesOrderInput) => Promise<Result<SalesOrder>>;
  updateSalesOrder: (id: string, patch: Partial<SalesOrderInput>) => Promise<Result>;
  confirmSalesOrder: (id: string) => Promise<Result>;
  fulfilSalesOrder: (id: string) => Promise<Result>;
  cancelSalesOrder: (id: string) => Promise<Result>;
  deleteSalesOrder: (id: string) => Promise<Result>;
  convertSalesOrderToInvoice: (id: string) => Promise<Result<Invoice>>;

  createInvoice: (input: InvoiceInput) => Promise<Result<Invoice>>;
  updateInvoice: (id: string, patch: Partial<InvoiceInput>) => Promise<Result>;
  issueInvoice: (id: string) => Promise<Result>;
  voidInvoice: (id: string) => Promise<Result>;
  deleteInvoice: (id: string) => Promise<Result>;
  recordPayment: (invoiceId: string, payment: Omit<Payment, "id">) => Promise<Result>;
  deletePayment: (invoiceId: string, paymentId: string) => Promise<Result>;
}

export type AppState = State & Actions;

export const useStore = create<AppState>()((set, get) => {
  const readable = (keys: Key[]) => keys.filter((k) => !sources[k].permission || can(get().user?.role, sources[k].permission!));

  const signedOut = () => {
    if (isApp) {
      configureApi({ token: null });
      void appStorage.remove(TOKEN_KEY);
    }
    set({ status: "signed-out", user: null, settings: emptySettings, ...emptyCollections() });
  };

  /** Call the API, refresh what it touched, and turn failures into a Result. */
  async function run<T>(call: () => Promise<T>, touches: Key[]): Promise<Result<T>> {
    try {
      const value = await call();
      await get().refresh(...touches);
      return { ok: true, value };
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signedOut();
      return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
    }
  }
  const done = async <T,>(p: Promise<Result<T>>): Promise<Result> => {
    const r = await p;
    return r.ok ? { ok: true, value: undefined } : r;
  };

  const documents: Key[] = ["quotations", "salesOrders", "invoices"];

  return {
    status: "checking",
    connectionError: null,
    serverChangeRequested: false,
    user: null,
    settings: emptySettings,
    ...emptyCollections(),

    bootstrap: async () => {
      try {
        if (isApp) {
          // Apps remember the server and their token between launches.
          const [server, token] = await Promise.all([appStorage.get(SERVER_KEY), appStorage.get(TOKEN_KEY)]);
          if (!server || !token) return signedOut();
          configureApi({ baseUrl: server, token });
        }
        const { user } = await api.get<{ user: SessionUser }>("/auth/me");
        set({ user, status: "loading" });
        await get().refresh();
        set({ status: "ready", connectionError: null });
      } catch (err) {
        // Only a rejected token means "signed out". Apps started without signal keep their saved
        // sign-in and offer a retry instead of throwing it away.
        if (isApp && !(err instanceof ApiError && err.status === 401)) {
          set({ status: "unreachable", connectionError: err instanceof Error ? err.message : "Can't reach the server." });
          return;
        }
        signedOut();
      }
    },

    login: async (email, password, server) => {
      try {
        if (isApp) {
          const baseUrl = normaliseServerUrl(server ?? "");
          if (!baseUrl) return { ok: false, error: "Enter your company's server address." };
          configureApi({ baseUrl, token: null });
          if (!(await probeServer(baseUrl))) {
            return { ok: false, error: `No InvenTrack server found at ${baseUrl}. Check the address and your connection.` };
          }
          const { user, token } = await api.post<{ user: SessionUser; token: string }>("/auth/login", {
            email,
            password,
            client: "app",
          });
          configureApi({ token });
          await Promise.all([appStorage.set(SERVER_KEY, baseUrl), appStorage.set(TOKEN_KEY, token)]);
          set({ user, status: "loading" });
          await get().refresh();
          set({ status: "ready", serverChangeRequested: false });
          return { ok: true, value: undefined };
        }
        const { user } = await api.post<{ user: SessionUser }>("/auth/login", { email, password });
        set({ user, status: "loading" });
        await get().refresh();
        set({ status: "ready" });
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Sign-in failed." };
      }
    },

    logout: async () => {
      await api.post("/auth/logout").catch(() => undefined);
      signedOut();
    },

    switchServer: async () => {
      await get().logout();
      set({ serverChangeRequested: true });
    },

    changePassword: async (currentPassword, newPassword) => {
      const r = await run(() => api.post<{ ok: true; token?: string }>("/auth/password", { currentPassword, newPassword }), []);
      // Changing the password signs out every other device; the app gets a fresh token for itself.
      if (r.ok && r.value.token) {
        configureApi({ token: r.value.token });
        await appStorage.set(TOKEN_KEY, r.value.token);
      }
      return r.ok ? { ok: true, value: undefined } : r;
    },

    refresh: async (...keys) => {
      const wanted = readable(keys.length ? keys : allKeys);
      try {
        const results = await Promise.all(wanted.map((k) => api.get<unknown>(sources[k].path)));
        set(Object.fromEntries(wanted.map((k, i) => [k, results[i]])) as Partial<State>);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) signedOut();
        else throw err;
      }
    },

    updateSettings: (settings) => done(run(() => api.put("/settings", settings), ["settings"])),

    createUser: (input) => done(run(() => api.post("/users", input), ["users", "settings"])),
    updateUser: (id, patch) => done(run(() => api.patch(`/users/${id}`, patch), ["users", "settings"])),

    addCustomer: (input) => run(() => api.post<Customer>("/customers", input), ["customers"]),
    updateCustomer: (id, patch) => done(run(() => api.patch(`/customers/${id}`, patch), ["customers", "jobs"])),
    deleteCustomer: (id) => done(run(() => api.del(`/customers/${id}`), ["customers"])),

    addInventoryItem: (input) => done(run(() => api.post("/inventory", input), ["inventory", "stockMovements"])),
    updateInventoryItem: (id, patch) => done(run(() => api.patch(`/inventory/${id}`, patch), ["inventory"])),
    deleteInventoryItem: (id) => done(run(() => api.del(`/inventory/${id}`), ["inventory", "stockMovements"])),
    adjustStock: (itemId, delta, reference, note = "") =>
      done(run(() => api.post(`/inventory/${itemId}/adjust`, { delta, reference, note }), ["inventory", "stockMovements"])),

    addJob: ({ customer: _name, ...input }) => run(() => api.post<ServiceJob>("/jobs", input), ["jobs"]),
    updateJob: (id, { customer: _name, jobNumber: _num, ...patch }) =>
      done(run(() => api.patch(`/jobs/${id}`, patch), ["jobs", "inventory", "stockMovements"])),
    deleteJob: (id) => done(run(() => api.del(`/jobs/${id}`), ["jobs", "attendance"])),
    createInvoiceFromJob: (jobId) => run(() => api.post<Invoice>(`/jobs/${jobId}/invoice`), ["jobs", "invoices"]),

    checkIn: (jobId, technician, location = null) =>
      run(() => api.post<AttendanceRecord>("/attendance/check-in", { jobId, technician, location }), ["attendance", "jobs"]),
    checkOut: (recordId, notes = "", location = null) =>
      done(run(() => api.post(`/attendance/${recordId}/check-out`, { notes, location }), ["attendance"])),
    deleteAttendance: (recordId) => done(run(() => api.del(`/attendance/${recordId}`), ["attendance"])),

    createQuotation: (input) => run(() => api.post<Quotation>("/quotations", input), ["quotations"]),
    updateQuotation: (id, patch) => done(run(() => api.patch(`/quotations/${id}`, patch), ["quotations"])),
    setQuotationStatus: (id, status) => done(run(() => api.post(`/quotations/${id}/status`, { status }), ["quotations"])),
    deleteQuotation: (id) => done(run(() => api.del(`/quotations/${id}`), ["quotations"])),
    convertQuotationToSalesOrder: (id) =>
      run(() => api.post<SalesOrder>(`/quotations/${id}/convert-to-sales-order`), documents),
    convertQuotationToInvoice: (id) => run(() => api.post<Invoice>(`/quotations/${id}/convert-to-invoice`), documents),

    createSalesOrder: (input) => run(() => api.post<SalesOrder>("/sales-orders", input), ["salesOrders"]),
    updateSalesOrder: (id, patch) => done(run(() => api.patch(`/sales-orders/${id}`, patch), ["salesOrders"])),
    confirmSalesOrder: (id) => done(run(() => api.post(`/sales-orders/${id}/confirm`), ["salesOrders"])),
    fulfilSalesOrder: (id) =>
      done(run(() => api.post(`/sales-orders/${id}/fulfil`), ["salesOrders", "inventory", "stockMovements"])),
    cancelSalesOrder: (id) => done(run(() => api.post(`/sales-orders/${id}/cancel`), ["salesOrders"])),
    deleteSalesOrder: (id) => done(run(() => api.del(`/sales-orders/${id}`), documents)),
    convertSalesOrderToInvoice: (id) => run(() => api.post<Invoice>(`/sales-orders/${id}/invoice`), documents),

    createInvoice: (input) => run(() => api.post<Invoice>("/invoices", input), ["invoices"]),
    updateInvoice: (id, patch) => done(run(() => api.patch(`/invoices/${id}`, patch), ["invoices"])),
    issueInvoice: (id) => done(run(() => api.post(`/invoices/${id}/issue`), ["invoices"])),
    voidInvoice: (id) => done(run(() => api.post(`/invoices/${id}/void`), [...documents, "jobs"])),
    deleteInvoice: (id) => done(run(() => api.del(`/invoices/${id}`), [...documents, "jobs"])),
    recordPayment: (invoiceId, payment) => done(run(() => api.post(`/invoices/${invoiceId}/payments`, payment), ["invoices"])),
    deletePayment: (invoiceId, paymentId) =>
      done(run(() => api.del(`/invoices/${invoiceId}/payments/${paymentId}`), ["invoices"])),
  };
});

/** Permission check for the signed-in user. */
export const useCan = (permission: Permission) => useStore((s) => can(s.user?.role, permission));

export const selectCustomerName = (customers: Customer[], id: string | null) =>
  customers.find((c) => c.id === id)?.name ?? "Unknown customer";
