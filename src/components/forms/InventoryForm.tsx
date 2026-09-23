import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumberInput from "@/components/common/NumberInput";
import { inventoryCategories } from "@/lib/constants";
import type { NewInventoryItem } from "@/store/useStore";
import type { InventoryCategory, InventoryItem } from "@/types";

const blank: NewInventoryItem = {
  sku: "",
  name: "",
  category: "Electronics",
  brand: "",
  model: "",
  serialNumber: "",
  location: "",
  currentStock: 0,
  minStock: 0,
  unitCost: 0,
  unitPrice: 0,
  assignedTo: null,
};

interface InventoryFormProps {
  open: boolean;
  item: InventoryItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewInventoryItem) => void;
}

const InventoryForm = ({ open, item, onOpenChange, onSave }: InventoryFormProps) => {
  const [form, setForm] = useState<NewInventoryItem>(blank);
  useEffect(() => {
    if (open) setForm(item ? { ...blank, ...item } : blank);
  }, [open, item]);

  const set = (patch: Partial<NewInventoryItem>) => setForm((f) => ({ ...f, ...patch }));
  const text = (key: "sku" | "name" | "brand" | "model" | "serialNumber" | "location") => ({
    id: `inv-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value }),
  });
  const margin = form.unitPrice > 0 ? ((form.unitPrice - form.unitCost) / form.unitPrice) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : "Add inventory item"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, assignedTo: form.assignedTo?.trim() || null });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="inv-name">Item name</Label>
              <Input {...text("name")} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-sku">SKU</Label>
              <Input {...text("sku")} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-category">Category</Label>
              <Select value={form.category} onValueChange={(v) => set({ category: v as InventoryCategory })}>
                <SelectTrigger id="inv-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inventoryCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-brand">Brand</Label>
              <Input {...text("brand")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-model">Model</Label>
              <Input {...text("model")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-serialNumber">Serial number</Label>
              <Input {...text("serialNumber")} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="inv-location">Location</Label>
              <Input {...text("location")} required />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-stock">{item ? "Stock (use Stock in/out)" : "Opening stock"}</Label>
              <NumberInput
                id="inv-stock"
                min={0}
                value={form.currentStock}
                onValueChange={(currentStock) => set({ currentStock })}
                disabled={Boolean(item)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-min">Reorder level</Label>
              <NumberInput id="inv-min" min={0} value={form.minStock} onValueChange={(minStock) => set({ minStock })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-cost">Unit cost (S$)</Label>
              <NumberInput
                id="inv-cost"
                min={0}
                step="0.01"
                value={form.unitCost}
                onValueChange={(unitCost) => set({ unitCost })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-price">Selling price (S$)</Label>
              <NumberInput
                id="inv-price"
                min={0}
                step="0.01"
                value={form.unitPrice}
                onValueChange={(unitPrice) => set({ unitPrice })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Margin: <span className="tabular">{margin.toFixed(1)}%</span>. Selling price is the default on quotations and
            invoices.
          </p>

          <div className="grid gap-1.5">
            <Label htmlFor="inv-assigned">Assigned to (optional)</Label>
            <Input
              id="inv-assigned"
              value={form.assignedTo ?? ""}
              onChange={(e) => set({ assignedTo: e.target.value })}
              placeholder="e.g. Tech Team A"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? "Save changes" : "Add item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryForm;
