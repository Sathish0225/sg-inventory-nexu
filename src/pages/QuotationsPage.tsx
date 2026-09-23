import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  Printer,
  Receipt,
  Send,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
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
import { printQuotation } from "@/lib/print";
import { notify } from "@/lib/result";
import { selectCustomerName, useStore } from "@/store/useStore";
import type { Quotation, QuotationStatus } from "@/types";

const statuses: ("All" | QuotationStatus)[] = ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired"];

/** Sent quotations past their validity date are shown as expired. */
const effectiveStatus = (q: Quotation, today: string): QuotationStatus =>
  q.status === "Sent" && q.validUntil < today ? "Expired" : q.status;

const toForm = (q: Quotation): DocumentFormValues => ({
  customerId: q.customerId,
  date: q.date,
  secondDate: q.validUntil,
  reference: q.reference,
  lines: q.lines,
  notes: q.notes,
  terms: q.terms,
  gstRate: q.gstRate,
});

const QuotationsPage = () => {
  const navigate = useNavigate();
  const quotations = useStore((s) => s.quotations);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const store = useStore.getState;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Quotation | null>(null);

  const today = todayISO();
  const rows = useMemo(
    () =>
      quotations
        .map((q) => ({ q, status: effectiveStatus(q, today), total: documentTotals(q.lines, q.gstRate).total }))
        .filter(({ q, status: st }) => {
          const term = search.toLowerCase();
          const matches =
            q.number.toLowerCase().includes(term) ||
            q.reference.toLowerCase().includes(term) ||
            selectCustomerName(customers, q.customerId).toLowerCase().includes(term);
          return matches && (status === "All" || st === status);
        })
        .sort((a, b) => b.q.date.localeCompare(a.q.date) || b.q.number.localeCompare(a.q.number)),
    [quotations, customers, search, status, today],
  );

  const all = quotations.map((q) => ({ status: effectiveStatus(q, today), total: documentTotals(q.lines, q.gstRate).total }));
  const open = all.filter((x) => x.status === "Draft" || x.status === "Sent");
  const accepted = all.filter((x) => x.status === "Accepted").length;
  const decided = all.filter((x) => ["Accepted", "Rejected", "Expired"].includes(x.status)).length;

  const save = async (values: DocumentFormValues) => {
    const input = {
      customerId: values.customerId,
      date: values.date,
      validUntil: values.secondDate,
      reference: values.reference,
      lines: values.lines,
      notes: values.notes,
      terms: values.terms,
      gstRate: values.gstRate,
    };
    if (editing) {
      if (notify(await store().updateQuotation(editing.id, input), `${editing.number} updated`)) setEditing(null);
    } else {
      const r = await store().createQuotation({ ...input, status: "Draft" });
      if (notify(r, r.ok ? `${r.value.number} created` : undefined)) setCreating(false);
    }
  };

  const locked = (q: Quotation) => Boolean(q.salesOrderId || q.invoiceId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Prepare quotes, track customer decisions and convert wins into orders or invoices."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New quotation
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Open quotations" value={open.length} icon={FileSpreadsheet} />
        <StatCard
          label="Pipeline value"
          value={formatSGDCompact(open.reduce((s, x) => s + x.total, 0))}
          hint="Draft + sent, incl. GST"
          icon={Send}
          tone="violet"
        />
        <StatCard label="Accepted" value={accepted} icon={CheckCircle2} tone="green" />
        <StatCard
          label="Win rate"
          value={decided ? `${Math.round((accepted / decided) * 100)}%` : "—"}
          hint="Accepted ÷ decided"
          icon={CheckCircle2}
          tone="amber"
        />
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
            <EmptyState icon={FileSpreadsheet} title="No quotations found">
              Try a different filter or create a new quotation.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ q, status: st, total }) => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => setEditing(q)}>
                      <TableCell>
                        <p className="whitespace-nowrap font-medium">{q.number}</p>
                        {q.reference && <p className="text-xs text-muted-foreground">{q.reference}</p>}
                      </TableCell>
                      <TableCell>{selectCustomerName(customers, q.customerId)}</TableCell>
                      <TableCell>{formatDate(q.date)}</TableCell>
                      <TableCell>{formatDate(q.validUntil)}</TableCell>
                      <TableCell className="tabular text-right font-medium">{formatSGD(total)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadge status={st} />
                          {q.salesOrderId && <StatusBadge status="→ SO" className="bg-muted text-muted-foreground" />}
                          {q.invoiceId && <StatusBadge status="→ Invoice" className="bg-muted text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${q.number}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => printQuotation(q, customers.find((c) => c.id === q.customerId), settings)}
                            >
                              <Printer className="mr-2 h-4 w-4" /> Print / PDF
                            </DropdownMenuItem>
                            {!locked(q) && (
                              <>
                                <DropdownMenuSeparator />
                                {q.status === "Draft" && (
                                  <DropdownMenuItem
                                    onClick={async () => notify(await store().setQuotationStatus(q.id, "Sent"), `${q.number} marked as sent`)}
                                  >
                                    <Send className="mr-2 h-4 w-4" /> Mark as sent
                                  </DropdownMenuItem>
                                )}
                                {st !== "Accepted" && (
                                  <DropdownMenuItem
                                    onClick={async () => notify(await store().setQuotationStatus(q.id, "Accepted"), `${q.number} accepted`)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as accepted
                                  </DropdownMenuItem>
                                )}
                                {st !== "Rejected" && (
                                  <DropdownMenuItem
                                    onClick={async () => notify(await store().setQuotationStatus(q.id, "Rejected"), `${q.number} rejected`)}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" /> Mark as rejected
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const r = await store().convertQuotationToSalesOrder(q.id);
                                    if (notify(r, r.ok ? `Sales order ${r.value.number} created` : undefined)) navigate("/sales");
                                  }}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" /> Convert to sales order
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const r = await store().convertQuotationToInvoice(q.id);
                                    if (notify(r, r.ok ? `Draft invoice ${r.value.number} created` : undefined)) navigate("/invoices");
                                  }}
                                >
                                  <Receipt className="mr-2 h-4 w-4" /> Convert to invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(q)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentEditorDialog
        kind="quotation"
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
        readOnlyReason="This quotation has been converted and is now read-only."
        onSubmit={save}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.number}?`}
        description="The quotation will be permanently removed."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) notify(await store().deleteQuotation(deleting.id), `${deleting.number} deleted`);
          setDeleting(null);
        }}
      />
    </div>
  );
};

export default QuotationsPage;
