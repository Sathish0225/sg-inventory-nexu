import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Alert } from "react-native";
import { can, type Permission } from "@/lib/permissions";
import type {
  AttendanceRecord,
  CompanySettings,
  Customer,
  InventoryItem,
  Invoice,
  Quotation,
  SalesOrder,
  ServiceJob,
  StockMovement,
} from "@/types";
import { api } from "./api";
import { useSession } from "./session";

// One query per API collection. Screens read from these; actions go through useAction, which
// refreshes the collections they affect.

const collections = {
  settings: { path: "/settings" },
  customers: { path: "/customers", permission: "customers:read" },
  inventory: { path: "/inventory", permission: "inventory:read" },
  stockMovements: { path: "/stock-movements?limit=100", permission: "inventory:read" },
  jobs: { path: "/jobs", permission: "jobs:read" },
  attendance: { path: "/attendance" },
  quotations: { path: "/quotations", permission: "sales:read" },
  salesOrders: { path: "/sales-orders", permission: "sales:read" },
  invoices: { path: "/invoices", permission: "invoices:read" },
} satisfies Record<string, { path: string; permission?: Permission }>;

export type Collection = keyof typeof collections;

interface CollectionTypes {
  settings: CompanySettings;
  customers: Customer[];
  inventory: InventoryItem[];
  stockMovements: (StockMovement & { itemName: string })[];
  jobs: ServiceJob[];
  attendance: AttendanceRecord[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
}

const empty: { [K in Collection]: CollectionTypes[K] | undefined } = {
  settings: undefined,
  customers: [],
  inventory: [],
  stockMovements: [],
  jobs: [],
  attendance: [],
  quotations: [],
  salesOrders: [],
  invoices: [],
};

export function useCollection<K extends Collection>(key: K) {
  const { user } = useSession();
  const source: { path: string; permission?: Permission } = collections[key];
  const allowed = !source.permission || can(user?.role, source.permission);
  const query = useQuery({
    queryKey: [key] as QueryKey,
    queryFn: () => api.get<CollectionTypes[K]>(source.path),
    enabled: Boolean(user) && allowed,
  });
  return {
    data: (query.data ?? empty[key]) as CollectionTypes[K] extends unknown[] ? CollectionTypes[K] : CollectionTypes[K] | undefined,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

/**
 * A server action (check in, issue invoice, …). Shows the server's message on failure and
 * refreshes the listed collections on success.
 */
export function useAction<TArgs, TResult = unknown>(
  run: (args: TArgs) => Promise<TResult>,
  touches: Collection[],
) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: () => Promise.all(touches.map((key) => queryClient.invalidateQueries({ queryKey: [key] }))),
    onError: (err: Error) => Alert.alert("Couldn't complete that", err.message),
  });
  return {
    run: (args: TArgs) => mutation.mutateAsync(args).then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const }),
    ),
    busy: mutation.isPending,
  };
}

export { api };
