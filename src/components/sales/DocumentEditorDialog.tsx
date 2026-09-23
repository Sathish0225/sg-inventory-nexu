import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NumberInput from "@/components/common/NumberInput";
import { addDays, todayISO } from "@/lib/calc";
import { useStore } from "@/store/useStore";
import type { LineItem } from "@/types";
import CustomerSelect from "./CustomerSelect";
import { newLine } from "@/lib/lines";
import LineItemsEditor from "./LineItemsEditor";
import TotalsSummary from "./TotalsSummary";

export type DocumentKindUI = "quotation" | "salesOrder" | "invoice";

export interface DocumentFormValues {
  customerId: string;
  date: string;
  /** validUntil / deliveryDate / dueDate depending on the kind. */
  secondDate: string;
  reference: string;
  lines: LineItem[];
  notes: string;
  terms: string;
  gstRate: number;
}

const labels: Record<DocumentKindUI, { noun: string; second: string }> = {
  quotation: { noun: "quotation", second: "Valid until" },
  salesOrder: { noun: "sales order", second: "Delivery date" },
  invoice: { noun: "invoice", second: "Due date" },
};

interface DocumentEditorDialogProps {
  kind: DocumentKindUI;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing values when editing / viewing; omit to create. */
  initial?: DocumentFormValues | null;
  /** Shown in the title when editing an existing document. */
  number?: string;
  readOnly?: boolean;
  readOnlyReason?: string;
  onSubmit: (values: DocumentFormValues) => void;
}

const DocumentEditorDialog = ({
  kind,
  open,
  onOpenChange,
  initial,
  number,
  readOnly,
  readOnlyReason,
  onSubmit,
}: DocumentEditorDialogProps) => {
  const settings = useStore((s) => s.settings);
  const [values, setValues] = useState<DocumentFormValues | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValues(initial);
      return;
    }
    const today = todayISO();
    const offset =
      kind === "quotation" ? settings.quotationValidityDays : kind === "invoice" ? settings.paymentTermsDays : 7;
    setValues({
      customerId: "",
      date: today,
      secondDate: addDays(today, offset),
      reference: "",
      lines: [newLine()],
      notes: "",
      terms: kind === "quotation" ? settings.quotationTerms : "",
      gstRate: settings.gstRate,
    });
    // Initialise only when the dialog opens; re-running on every parent render would wipe edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!values) return null;
  const set = (patch: Partial<DocumentFormValues>) => setValues({ ...values, ...patch });
  const { noun, second } = labels[kind];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.customerId) return;
    const lines = values.lines.filter((l) => l.description.trim() && l.quantity > 0);
    onSubmit({ ...values, lines });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {number ? `${readOnly ? "" : "Edit "}${number}` : `New ${noun}`}
          </DialogTitle>
          <DialogDescription>
            {readOnly && readOnlyReason
              ? readOnlyReason
              : "Pick products from inventory or add service lines. GST is calculated on the discounted subtotal."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-1.5 md:col-span-2">
              <Label htmlFor="doc-customer">Customer</Label>
              <CustomerSelect
                id="doc-customer"
                value={values.customerId}
                onChange={(customerId) => set({ customerId })}
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-date">Date</Label>
              <Input
                id="doc-date"
                type="date"
                value={values.date}
                onChange={(e) => set({ date: e.target.value })}
                required
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-second">{second}</Label>
              <Input
                id="doc-second"
                type="date"
                value={values.secondDate}
                min={values.date}
                onChange={(e) => set({ secondDate: e.target.value })}
                required
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5 md:col-span-3">
              <Label htmlFor="doc-ref">Reference / customer PO</Label>
              <Input
                id="doc-ref"
                value={values.reference}
                onChange={(e) => set({ reference: e.target.value })}
                disabled={readOnly}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="doc-gst">GST %</Label>
              <NumberInput
                id="doc-gst"
                min={0}
                max={100}
                step="0.01"
                value={values.gstRate}
                onValueChange={(gstRate) => set({ gstRate })}
                disabled={readOnly}
              />
            </div>
          </div>

          <LineItemsEditor lines={values.lines} onChange={(lines) => set({ lines })} readOnly={readOnly} />

          <div className="grid gap-6 md:grid-cols-[1fr_auto]">
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="doc-notes">Notes</Label>
                <Textarea
                  id="doc-notes"
                  rows={2}
                  value={values.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  disabled={readOnly}
                />
              </div>
              {kind === "quotation" && (
                <div className="grid gap-1.5">
                  <Label htmlFor="doc-terms">Terms &amp; conditions</Label>
                  <Textarea
                    id="doc-terms"
                    rows={3}
                    value={values.terms}
                    onChange={(e) => set({ terms: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
              )}
            </div>
            <TotalsSummary lines={values.lines} gstRate={values.gstRate} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={!values.customerId}>
                {number ? "Save changes" : `Create ${noun}`}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentEditorDialog;
