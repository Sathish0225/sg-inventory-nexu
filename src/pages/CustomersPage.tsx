import { useMemo, useState } from "react";
import { Mail, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import CustomerDialog from "@/components/sales/CustomerDialog";
import { balanceDue, formatSGD, invoiceTotal } from "@/lib/calc";
import { notify } from "@/lib/result";
import { useStore } from "@/store/useStore";
import type { Customer } from "@/types";

const CustomersPage = () => {
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const jobs = useStore((s) => s.jobs);
  const quotations = useStore((s) => s.quotations);
  const store = useStore.getState;

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return customers
      .filter((c) =>
        [c.name, c.contactPerson, c.email, c.uen].some((v) => v.toLowerCase().includes(term)),
      )
      .map((c) => {
        const theirs = invoices.filter((i) => i.customerId === c.id && i.status === "Issued");
        return {
          customer: c,
          billed: theirs.reduce((s, i) => s + invoiceTotal(i), 0),
          outstanding: theirs.reduce((s, i) => s + Math.max(0, balanceDue(i)), 0),
          openQuotes: quotations.filter((q) => q.customerId === c.id && (q.status === "Draft" || q.status === "Sent")).length,
          jobs: jobs.filter((j) => j.customerId === c.id).length,
        };
      })
      .sort((a, b) => a.customer.name.localeCompare(b.customer.name));
  }, [customers, invoices, jobs, quotations, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="One customer record shared by service jobs, quotations, sales orders and invoices."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New customer
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, contact, email or UEN…" />
          {rows.length === 0 ? (
            <EmptyState icon={Users} title="No customers found" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Jobs</TableHead>
                    <TableHead className="text-right">Open quotes</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ customer: c, billed, outstanding, openQuotes, jobs: jobCount }) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium">{c.name}</p>
                        {c.uen && <p className="text-xs text-muted-foreground">UEN {c.uen}</p>}
                      </TableCell>
                      <TableCell>
                        <p>{c.contactPerson}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {c.email && (
                            <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${c.email}`}>
                              <Mail className="h-3 w-3" /> {c.email}
                            </a>
                          )}
                          {c.phone && (
                            <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${c.phone}`}>
                              <Phone className="h-3 w-3" /> {c.phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="tabular text-right">{jobCount}</TableCell>
                      <TableCell className="tabular text-right">{openQuotes}</TableCell>
                      <TableCell className="tabular text-right">{formatSGD(billed)}</TableCell>
                      <TableCell className={`tabular text-right font-medium ${outstanding > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                        {formatSGD(outstanding)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        open={creating || editing !== null}
        customer={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSave={(input) => {
          if (editing) {
            store().updateCustomer(editing.id, input);
            notify({ ok: true, value: undefined }, `${input.name} updated`);
          } else {
            store().addCustomer(input);
            notify({ ok: true, value: undefined }, `${input.name} added`);
          }
          setCreating(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Customers with jobs or sales documents can't be deleted."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleting) notify(store().deleteCustomer(deleting.id), `${deleting.name} deleted`);
          setDeleting(null);
        }}
      />
    </div>
  );
};

export default CustomersPage;
