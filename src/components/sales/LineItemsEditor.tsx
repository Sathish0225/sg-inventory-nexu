import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumberInput from "@/components/common/NumberInput";
import { formatSGD, lineNet } from "@/lib/calc";
import { newLine } from "@/lib/lines";
import { useStore } from "@/store/useStore";
import type { LineItem } from "@/types";

const CUSTOM = "__custom";

interface LineItemsEditorProps {
  lines: LineItem[];
  onChange: (lines: LineItem[]) => void;
  readOnly?: boolean;
}

const LineItemsEditor = ({ lines, onChange, readOnly }: LineItemsEditorProps) => {
  const inventory = useStore((s) => s.inventory);

  const update = (id: string, patch: Partial<LineItem>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const pickItem = (line: LineItem, itemId: string) => {
    if (itemId === CUSTOM) return update(line.id, { itemId: null });
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    update(line.id, {
      itemId,
      description: `${item.name} (${item.brand} ${item.model})`,
      unitPrice: item.unitPrice,
    });
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-48 p-2 text-left font-medium">Product</th>
              <th className="p-2 text-left font-medium">Description</th>
              <th className="w-20 p-2 text-right font-medium">Qty</th>
              <th className="w-28 p-2 text-right font-medium">Unit price</th>
              <th className="w-20 p-2 text-right font-medium">Disc %</th>
              <th className="w-28 p-2 text-right font-medium">Amount</th>
              {!readOnly && <th className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const stock = inventory.find((i) => i.id === line.itemId);
              return (
                <tr key={line.id} className="border-t align-top">
                  <td className="p-2">
                    <Select value={line.itemId ?? CUSTOM} onValueChange={(v) => pickItem(line, v)} disabled={readOnly}>
                      <SelectTrigger className="h-9" aria-label="Product">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CUSTOM}>Service / custom</SelectItem>
                        {inventory.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.sku} · {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stock && (
                      <p className={`mt-1 text-xs ${stock.currentStock < line.quantity ? "text-destructive" : "text-muted-foreground"}`}>
                        {stock.currentStock} in stock
                      </p>
                    )}
                  </td>
                  <td className="p-2">
                    <Input
                      className="h-9"
                      aria-label="Description"
                      value={line.description}
                      onChange={(e) => update(line.id, { description: e.target.value })}
                      required
                      disabled={readOnly}
                    />
                  </td>
                  <td className="p-2">
                    <NumberInput
                      className="h-9 text-right"
                      aria-label="Quantity"
                      min={0}
                      step="any"
                      value={line.quantity}
                      onValueChange={(quantity) => update(line.id, { quantity })}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="p-2">
                    <NumberInput
                      className="h-9 text-right"
                      aria-label="Unit price"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onValueChange={(unitPrice) => update(line.id, { unitPrice })}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="p-2">
                    <NumberInput
                      className="h-9 text-right"
                      aria-label="Discount percent"
                      min={0}
                      max={100}
                      value={line.discountPct}
                      onValueChange={(discountPct) => update(line.id, { discountPct })}
                      disabled={readOnly}
                    />
                  </td>
                  <td className="tabular p-2 pt-4 text-right font-medium">{formatSGD(lineNet(line))}</td>
                  {!readOnly && (
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove line"
                        onClick={() => onChange(lines.filter((l) => l.id !== line.id))}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
            {lines.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                  No lines yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lines, newLine()])}>
          <Plus className="mr-1 h-4 w-4" /> Add line
        </Button>
      )}
    </div>
  );
};

export default LineItemsEditor;
