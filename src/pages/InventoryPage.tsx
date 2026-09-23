import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  History,
  MapPin,
  Package,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import EmptyState from "@/components/common/EmptyState";
import NumberInput from "@/components/common/NumberInput";
import PageHeader from "@/components/common/PageHeader";
import SearchInput from "@/components/common/SearchInput";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import InventoryForm from "@/components/forms/InventoryForm";
import { inventoryCategories } from "@/lib/constants";
import { formatDate, formatDateTime, formatSGD, formatSGDCompact, stockStatus } from "@/lib/calc";
import { printInventoryReport } from "@/lib/print";
import { notify } from "@/lib/result";
import { useCan, useStore, type NewInventoryItem } from "@/store/useStore";
import type { InventoryItem } from "@/types";

const ALL = "__all";

const InventoryPage = () => {
  const inventory = useStore((s) => s.inventory);
  const movements = useStore((s) => s.stockMovements);
  const settings = useStore((s) => s.settings);
  const store = useStore.getState;
  const canWrite = useCan("inventory:write");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [lowOnly, setLowOnly] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [moving, setMoving] = useState<{ item: InventoryItem; direction: "in" | "out" } | null>(null);
  const [move, setMove] = useState({ quantity: 1, reference: "", note: "" });

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return inventory
      .filter((i) => [i.name, i.sku, i.serialNumber, i.brand, i.location].some((v) => v.toLowerCase().includes(term)))
      .filter((i) => category === ALL || i.category === category)
      .filter((i) => !lowOnly || ["Low Stock", "Out of Stock"].includes(stockStatus(i)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, search, category, lowOnly]);

  const totalValue = inventory.reduce((s, i) => s + i.currentStock * i.unitCost, 0);
  const lowCount = inventory.filter((i) => ["Low Stock", "Out of Stock"].includes(stockStatus(i))).length;

  const save = async (data: NewInventoryItem) => {
    // Stock levels only change through recorded movements.
    const { currentStock: _ignored, ...patch } = data;
    const r = editing ? await store().updateInventoryItem(editing.id, patch) : await store().addInventoryItem(data);
    if (notify(r, `${data.name} ${editing ? "updated" : "added"}`)) {
      setFormOpen(false);
      setEditing(null);
    }
  };

  const openMove = (item: InventoryItem, direction: "in" | "out") => {
    setMoving({ item, direction });
    setMove({ quantity: 1, reference: "", note: "" });
  };

  const submitMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moving) return;
    const delta = moving.direction === "in" ? move.quantity : -move.quantity;
    const r = await store().adjustStock(moving.item.id, delta, move.reference || (moving.direction === "in" ? "Stock in" : "Stock out"), move.note);
    if (notify(r, `${moving.item.name}: ${delta > 0 ? "+" : ""}${delta}`)) setMoving(null);
  };

  const itemName = (id: string) => inventory.find((i) => i.id === id)?.name ?? "Deleted item";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock levels, reorder alerts and a full movement history."
        actions={
          <>
            <Button variant="outline" onClick={() => printInventoryReport(rows, settings)}>
              <Printer className="mr-2 h-4 w-4" /> Report
            </Button>
            {canWrite && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add item
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Items" value={inventory.length} icon={Package} />
        <StatCard label="Stock value" value={formatSGDCompact(totalValue)} hint="At cost" icon={DollarSign} tone="green" />
        <StatCard label="Low / out of stock" value={lowCount} icon={AlertTriangle} tone={lowCount ? "red" : "green"} />
        <StatCard label="Assigned" value={inventory.filter((i) => i.assignedTo).length} icon={Users} tone="violet" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, SKU, serial, brand or location…" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-48" aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {inventoryCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant={lowOnly ? "default" : "outline"} onClick={() => setLowOnly(!lowOnly)}>
              <AlertTriangle className="mr-2 h-4 w-4" /> Needs reorder
            </Button>
          </div>

          {rows.length === 0 ? (
            <EmptyState icon={Package} title="No items match" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Cost / Price</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-44" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku} · {item.brand} {item.model}
                          {item.serialNumber && ` · SN ${item.serialNumber}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" /> {item.location}
                        </p>
                        {item.assignedTo && <p className="text-xs text-primary">→ {item.assignedTo}</p>}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        <p className="font-medium">{item.currentStock}</p>
                        <p className="text-xs text-muted-foreground">min {item.minStock}</p>
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        <p>{formatSGD(item.unitCost)}</p>
                        <p className="text-muted-foreground">{formatSGD(item.unitPrice)}</p>
                      </TableCell>
                      <TableCell className="tabular text-right font-medium">
                        {formatSGD(item.currentStock * item.unitCost)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={stockStatus(item)} />
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.lastUpdated)}</p>
                      </TableCell>
                      <TableCell>
                        <div className={canWrite ? "flex justify-end" : "hidden"}>
                          <Button variant="ghost" size="icon" aria-label="Stock in" title="Stock in" onClick={() => openMove(item, "in")}>
                            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Stock out" title="Stock out" onClick={() => openMove(item, "out")}>
                            <ArrowUpFromLine className="h-4 w-4 text-amber-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Recent stock movements
          </CardTitle>
          <CardDescription>Manual adjustments, sales order fulfilment and parts used on completed jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No movements recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 15).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-sm">{formatDateTime(m.at)}</TableCell>
                      <TableCell>{itemName(m.itemId)}</TableCell>
                      <TableCell
                        className={`tabular text-right font-medium ${m.quantity > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </TableCell>
                      <TableCell>{m.reference}</TableCell>
                      <TableCell className="text-muted-foreground">{m.note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryForm
        open={formOpen}
        item={editing}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        onSave={save}
      />

      <Dialog open={moving !== null} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {moving?.direction === "in" ? "Stock in" : "Stock out"} · {moving?.item.name}
            </DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitMove}>
            <p className="text-sm text-muted-foreground">Currently {moving?.item.currentStock} in stock.</p>
            <div className="grid gap-1.5">
              <Label htmlFor="mv-qty">Quantity</Label>
              <NumberInput
                id="mv-qty"
                min={1}
                step="1"
                value={move.quantity}
                onValueChange={(quantity) => setMove({ ...move, quantity })}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mv-ref">Reference</Label>
              <Input
                id="mv-ref"
                value={move.reference}
                onChange={(e) => setMove({ ...move, reference: e.target.value })}
                placeholder={moving?.direction === "in" ? "Supplier PO / DO number" : "Issued to / job number"}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mv-note">Note</Label>
              <Input id="mv-note" value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMoving(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!(move.quantity > 0)}>
                Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="Existing documents keep their line descriptions, but the item will no longer be selectable."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleting) notify(await store().deleteInventoryItem(deleting.id), `${deleting.name} deleted`);
          setDeleting(null);
        }}
      />
    </div>
  );
};

export default InventoryPage;
