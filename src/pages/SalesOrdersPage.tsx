import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Ban, CheckCircle2, MoreHorizontal, PackageCheck, Plus, Printer, Receipt, ShoppingCart, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import DocumentEditorDialog, { type DocumentFormValues } from "@/components/sales/DocumentEditorDialog";
import { documentTotals, formatDate, formatSGD, formatSGDCompact, todayISO } from "@/lib/calc";
import { printSalesOrder } from "@/lib/print";
import { notify } from "@/lib/result";
import { selectCustomerName, useStore } from "@/store/useStore";
import type { SalesOrder, SalesOrderStatus } from "@/types";

const statuses: ("All" | SalesOrderStatus)[] = ["All", "Pending", "Confirmed", "Fulfilled", "Cancelled"];

const toForm = (o: SalesOrder): DocumentFormValues => ({
  customerId: o.customerId,
  date: o.date,
  secondDate: o.deliveryDate,
  reference: o.reference,
  lines: o.lines,
  notes: o.notes,
  terms: "",
  gstRate: o.gstRate,
});

const SalesOrdersPage = () => {
  const navigate = useNavigate();
  const orders = useStore((s) => s.salesOrders);
  const customers = useStore((s) => s.customers);
  const quotations = useStore((s) => s.quotations);
  const settings = useStore((s) => s.settings);
  const store = useStore.getState;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [editing, setEditing] = useState<SalesOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ order: SalesOrder; action: "fulfil" | "cancel" | "delete" } | null>(null);

  const rows = useMemo(
    () =>
      orders
        .filter((o) => {
          const term = search.toLowerCase();
          const matches =
            o.number.toLowerCase().includes(term) ||
            o.reference.toLowerCase().includes(term) ||
            selectCustomerName(customers, o.customerId).toLowerCase().includes(term);
          return matches && (status === "All" || o.status === status);
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)),
    [orders, customers, search, status],
  );

  const monthPrefix = todayISO().slice(0, 7);
  const active = orders.filter((o) => o.status !== "Cancelled");
  const salesThisMonth = active
    .filter((o) => o.date.startsWith(monthPrefix))
    .reduce((s, o) => s + documentTotals(o.lines, o.gstRate).subtotal, 0);
  const toFulfil = orders.filter((o) => o.status === "Pending" || o.status === "Confirmed");
  const uninvoiced = active.filter((o) => !o.invoiceId);

  const save = (values: DocumentFormValues) => {
    const input = {
      customerId: values.customerId,
      date: values.date,
      deliveryDate: values.secondDate,
      reference: values.reference,
      lines: values.lines,
      notes: values.notes,
      gstRate: values.gstRate,
    };
    if (editing) {
      if (notify(store().updateSalesOrder(editing.id, input), `${editing.number} updated`)) setEditing(null);
    } else {
      const o = store().createSalesOrder({ ...input, status: "Pending" });
      notify({ ok: true, value: o }, `${o.number} created`);
      setCreating(false);
    }
  };

  const runConfirm = () => {
    if (!confirm) return;
    const { order, action } = confirm;
    if (action === "fulfil") notify(store().fulfilSalesOrder(order.id), `${order.number} fulfilled — stock updated`);
    if (action === "cancel") notify(store().cancelSalesOrder(order.id), `${order.number} cancelled`);
    if (action === "delete") notify(store().deleteSalesOrder(order.id), `${order.number} deleted`);
    setConfirm(null);
  };

  const locked = (o: SalesOrder) => o.status === "Fulfilled" || o.status === "Cancelled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Orders"
        description="Confirm orders, fulfil them from stock and hand them over to invoicing."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New sales order
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Sales this month" value={formatSGDCompact(salesThisMonth)} hint="Excl. GST" icon={ShoppingCart} />
        <StatCard label="Awaiting fulfilment" value={toFulfil.length} icon={Truck} tone="amber" />
        <StatCard
          label="Fulfilled"
          value={orders.filter((o) => o.status === "Fulfilled").length}
          icon={PackageCheck}
          tone="green"
        />
        <StatCard label="Not yet invoiced" value={uninvoiced.length} icon={Receipt} tone="violet" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Search number, customer or reference…" />
            <Tabs value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <TabsList className="flex-wrap">
                {statuses.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="No sales orders found">
              Create one here or convert an accepted quotation.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((o) => {
                    const quote = quotations.find((q) => q.id === o.quotationId);
                    return (
                      <TableRow key={o.id} className="cursor-pointer" onClick={() => setEditing(o)}>
                        <TableCell>
                          <p className="whitespace-nowrap font-medium">{o.number}</p>
                          <p className="text-xs text-muted-foreground">
                            {[quote && `from ${quote.number}`, o.reference].filter(Boolean).join(" · ")}
                          </p>
                        </TableCell>
                        <TableCell>{selectCustomerName(customers, o.customerId)}</TableCell>
                        <TableCell>{formatDate(o.date)}</TableCell>
                        <TableCell>{formatDate(o.deliveryDate)}</TableCell>
                        <TableCell className="tabular text-right font-medium">
                          {formatSGD(documentTotals(o.lines, o.gstRate).total)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <StatusBadge status={o.status} />
                            {o.invoiceId && <StatusBadge status="Invoiced" className="bg-muted text-muted-foreground" />}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label={`Actions for ${o.number}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => printSalesOrder(o, customers.find((c) => c.id === o.customerId), settings)}
                              >
                                <Printer className="mr-2 h-4 w-4" /> Print / PDF
                              </DropdownMenuItem>
                              {o.status === "Pending" && (
                                <DropdownMenuItem
                                  onClick={() => notify(store().confirmSalesOrder(o.id), `${o.number} confirmed`)}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm order
                                </DropdownMenuItem>
                              )}
                              {!locked(o) && (
                                <DropdownMenuItem onClick={() => setConfirm({ order: o, action: "fulfil" })}>
                                  <PackageCheck className="mr-2 h-4 w-4" /> Fulfil (deduct stock)
                                </DropdownMenuItem>
                              )}
                              {!o.invoiceId && o.status !== "Cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    const r = store().convertSalesOrderToInvoice(o.id);
                                    if (notify(r, r.ok ? `Draft invoice ${r.value.number} created` : undefined)) navigate("/invoices");
                                  }}
                                >
                                  <Receipt className="mr-2 h-4 w-4" /> Create invoice
                                </DropdownMenuItem>
                              )}
                              {!locked(o) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setConfirm({ order: o, action: "cancel" })}>
                                    <Ban className="mr-2 h-4 w-4" /> Cancel order
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setConfirm({ order: o, action: "delete" })}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentEditorDialog
        kind="salesOrder"
        open={creating || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing ? toForm(editing) : null}
        number={editing?.number}
        readOnly={editing ? locked(editing) : false}
        readOnlyReason={`This order is ${editing?.status.toLowerCase()} and can no longer be edited.`}
        onSubmit={save}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        destructive={confirm?.action !== "fulfil"}
        title={
          confirm?.action === "fulfil"
            ? `Fulfil ${confirm.order.number}?`
            : confirm?.action === "cancel"
              ? `Cancel ${confirm?.order.number}?`
              : `Delete ${confirm?.order.number}?`
        }
        description={
          confirm?.action === "fulfil"
            ? "Stock for every inventory line will be deducted now. This cannot be undone from here."
            : confirm?.action === "cancel"
              ? "The order will be kept for reference but can no longer be fulfilled or invoiced."
              : "The order will be permanently removed. A linked quotation becomes convertible again."
        }
        confirmLabel={confirm?.action === "fulfil" ? "Fulfil order" : confirm?.action === "cancel" ? "Cancel order" : "Delete"}
        onConfirm={runConfirm}
      />
    </div>
  );
};

export default SalesOrdersPage;
