import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Banknote, CircleDollarSign, FileCheck2, Plus, Printer, Receipt, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import NumberInput from "@/components/common/NumberInput";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import DocumentEditorDialog, { type DocumentFormValues } from "@/components/sales/DocumentEditorDialog";
import TotalsSummary from "@/components/sales/TotalsSummary";
import {
  amountPaid,
  balanceDue,
  formatDate,
  formatSGD,
  formatSGDCompact,
  invoiceDisplayStatus,
  invoiceTotal,
  lineNet,
  todayISO,
} from "@/lib/calc";
import { printInvoice } from "@/lib/print";
import { notify } from "@/lib/result";
import { selectCustomerName, useStore } from "@/store/useStore";
import type { Invoice, InvoiceDisplayStatus, PaymentMethod } from "@/types";

const filters: ("All" | InvoiceDisplayStatus)[] = ["All", "Draft", "Unpaid", "Partially Paid", "Overdue", "Paid", "Void"];
const methods: PaymentMethod[] = ["Bank Transfer", "PayNow", "Cheque", "Cash", "Credit Card"];

const toForm = (inv: Invoice): DocumentFormValues => ({
  customerId: inv.customerId,
  date: inv.date,
  secondDate: inv.dueDate,
  reference: inv.reference,
  lines: inv.lines,
  notes: inv.notes,
  terms: "",
  gstRate: inv.gstRate,
});

const sourceLabel = (inv: Invoice, lookup: (type: string, id: string) => string | undefined) =>
  inv.source ? lookup(inv.source.type, inv.source.id) : undefined;

const InvoicesPage = () => {
  const invoices = useStore((s) => s.invoices);
  const customers = useStore((s) => s.customers);
  const quotations = useStore((s) => s.quotations);
  const orders = useStore((s) => s.salesOrders);
  const jobs = useStore((s) => s.jobs);
  const settings = useStore((s) => s.settings);
  const store = useStore.getState;

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ invoice: Invoice; action: "void" | "delete" } | null>(null);
  const [payment, setPayment] = useState({ date: todayISO(), amount: 0, method: "Bank Transfer" as PaymentMethod, reference: "" });

  const today = todayISO();
  const viewing = invoices.find((i) => i.id === viewingId) ?? null;

  const lookupSource = (type: string, id: string) =>
    type === "quotation"
      ? quotations.find((q) => q.id === id)?.number
      : type === "salesOrder"
        ? orders.find((o) => o.id === id)?.number
        : jobs.find((j) => j.id === id)?.jobNumber;

  const rows = useMemo(
    () =>
      invoices
        .map((inv) => ({ inv, status: invoiceDisplayStatus(inv, today), total: invoiceTotal(inv), balance: balanceDue(inv) }))
        .filter(({ inv, status }) => {
          const term = search.toLowerCase();
          const matches =
            inv.number.toLowerCase().includes(term) ||
            inv.reference.toLowerCase().includes(term) ||
            selectCustomerName(customers, inv.customerId).toLowerCase().includes(term);
          return matches && (filter === "All" || status === filter);
        })
        .sort((a, b) => b.inv.date.localeCompare(a.inv.date) || b.inv.number.localeCompare(a.inv.number)),
    [invoices, customers, search, filter, today],
  );

  const issued = invoices.filter((i) => i.status === "Issued");
  const outstanding = issued.reduce((s, i) => s + Math.max(0, balanceDue(i)), 0);
  const overdue = issued.filter((i) => invoiceDisplayStatus(i, today) === "Overdue");
  const monthPrefix = today.slice(0, 7);
  const collected = invoices
    .flatMap((i) => (i.status === "Void" ? [] : i.payments))
    .filter((p) => p.date.startsWith(monthPrefix))
    .reduce((s, p) => s + p.amount, 0);

  const openInvoice = (inv: Invoice) => {
    setViewingId(inv.id);
    setPayment({ date: today, amount: Math.max(0, balanceDue(inv)), method: "Bank Transfer", reference: "" });
  };

  const save = async (values: DocumentFormValues) => {
    const input = {
      customerId: values.customerId,
      date: values.date,
      dueDate: values.secondDate,
      reference: values.reference,
      lines: values.lines,
      notes: values.notes,
      gstRate: values.gstRate,
    };
    if (editing) {
      if (notify(await store().updateInvoice(editing.id, input), `${editing.number} updated`)) setEditing(null);
    } else {
      const r = await store().createInvoice(input);
      if (notify(r, r.ok ? `Draft invoice ${r.value.number} created` : undefined)) {
        setCreating(false);
        openInvoice(r.value);
      }
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { invoice, action } = confirm;
    if (action === "void") notify(await store().voidInvoice(invoice.id), `${invoice.number} voided`);
    if (action === "delete" && notify(await store().deleteInvoice(invoice.id), `${invoice.number} deleted`)) setViewingId(null);
    setConfirm(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Issue GST tax invoices, record payments and chase overdue balances."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatSGDCompact(outstanding)} hint={`${issued.length} issued invoices`} icon={Wallet} />
        <StatCard
          label="Overdue"
          value={formatSGDCompact(overdue.reduce((s, i) => s + balanceDue(i), 0))}
          hint={`${overdue.length} invoice${overdue.length === 1 ? "" : "s"}`}
          icon={AlertTriangle}
          tone="red"
        />
        <StatCard label="Collected this month" value={formatSGDCompact(collected)} icon={Banknote} tone="green" />
        <StatCard label="Drafts" value={invoices.filter((i) => i.status === "Draft").length} icon={Receipt} tone="violet" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Search number, customer or reference…" />
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="h-auto flex-wrap">
                {filters.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices found">
              Create one here, or bill a sales order, quotation or completed service job.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ inv, status, total, balance }) => (
                    <TableRow key={inv.id} className="cursor-pointer" onClick={() => openInvoice(inv)}>
                      <TableCell>
                        <p className="whitespace-nowrap font-medium">{inv.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {[sourceLabel(inv, lookupSource) && `from ${sourceLabel(inv, lookupSource)}`, inv.reference]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </TableCell>
                      <TableCell>{selectCustomerName(customers, inv.customerId)}</TableCell>
                      <TableCell>{formatDate(inv.date)}</TableCell>
                      <TableCell className={status === "Overdue" ? "font-medium text-destructive" : ""}>
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell className="tabular text-right">{formatSGD(total)}</TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {inv.status === "Issued" ? formatSGD(balance) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={viewing !== null} onOpenChange={(o) => !o && setViewingId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {viewing && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {viewing.number} <StatusBadge status={invoiceDisplayStatus(viewing, today)} />
                </SheetTitle>
                <SheetDescription>
                  {selectCustomerName(customers, viewing.customerId)} · issued {formatDate(viewing.date)} · due{" "}
                  {formatDate(viewing.dueDate)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printInvoice(viewing, customers.find((c) => c.id === viewing.customerId), settings)}
                >
                  <Printer className="mr-1 h-4 w-4" /> Print / PDF
                </Button>
                {viewing.status === "Draft" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(viewing)}>
                      Edit
                    </Button>
                    <Button size="sm" onClick={async () => notify(await store().issueInvoice(viewing.id), `${viewing.number} issued`)}>
                      <FileCheck2 className="mr-1 h-4 w-4" /> Issue invoice
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm({ invoice: viewing, action: "delete" })}>
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
                {viewing.status === "Issued" && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm({ invoice: viewing, action: "void" })}>
                    <Ban className="mr-1 h-4 w-4" /> Void
                  </Button>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                {viewing.lines.map((l) => (
                  <div key={l.id} className="flex justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{l.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {l.quantity} × {formatSGD(l.unitPrice)}
                        {l.discountPct ? ` · ${l.discountPct}% off` : ""}
                      </p>
                    </div>
                    <span className="tabular shrink-0">{formatSGD(lineNet(l))}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <TotalsSummary lines={viewing.lines} gstRate={viewing.gstRate}>
                  {viewing.status === "Issued" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid</span>
                        <span className="tabular">−{formatSGD(amountPaid(viewing))}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold">
                        <span>Balance due</span>
                        <span className="tabular">{formatSGD(balanceDue(viewing))}</span>
                      </div>
                    </>
                  )}
                </TotalsSummary>
              </div>

              <Separator className="my-4" />

              <h3 className="mb-2 text-sm font-medium">Payments</h3>
              {viewing.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {viewing.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                      <div>
                        <p className="font-medium tabular">{formatSGD(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(p.date)} · {p.method}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      {viewing.status === "Issued" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove payment"
                          onClick={async () => notify(await store().deletePayment(viewing.id, p.id), "Payment removed")}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {viewing.status === "Issued" && balanceDue(viewing) > 0 && (
                <form
                  className="mt-4 grid gap-3 rounded-md border bg-muted/30 p-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (notify(await store().recordPayment(viewing.id, payment), "Payment recorded")) {
                      const updated = useStore.getState().invoices.find((i) => i.id === viewing.id)!;
                      setPayment({ ...payment, amount: Math.max(0, balanceDue(updated)), reference: "" });
                    }
                  }}
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CircleDollarSign className="h-4 w-4" /> Record payment
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="pay-amount">Amount (S$)</Label>
                      <NumberInput
                        id="pay-amount"
                        min={0.01}
                        step="0.01"
                        value={payment.amount}
                        onValueChange={(amount) => setPayment({ ...payment, amount })}
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pay-date">Date</Label>
                      <Input
                        id="pay-date"
                        type="date"
                        value={payment.date}
                        onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pay-method">Method</Label>
                      <Select value={payment.method} onValueChange={(m) => setPayment({ ...payment, method: m as PaymentMethod })}>
                        <SelectTrigger id="pay-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="pay-ref">Reference</Label>
                      <Input
                        id="pay-ref"
                        value={payment.reference}
                        onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button type="submit" size="sm">
                    Record payment
                  </Button>
                </form>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <DocumentEditorDialog
        kind="invoice"
        open={creating || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing ? toForm(editing) : null}
        number={editing?.number}
        onSubmit={save}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.action === "void" ? `Void ${confirm.invoice.number}?` : `Delete ${confirm?.invoice.number}?`}
        description={
          confirm?.action === "void"
            ? "The invoice stays on record marked VOID (required for GST audit). Its source document can be invoiced again."
            : "This draft will be permanently removed."
        }
        confirmLabel={confirm?.action === "void" ? "Void invoice" : "Delete"}
        onConfirm={runConfirm}
      />
    </div>
  );
};

export default InvoicesPage;
