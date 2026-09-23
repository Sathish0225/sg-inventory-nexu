import { useEffect, useState } from "react";
import { notify } from "@/lib/result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NumberInput from "@/components/common/NumberInput";
import { useStore } from "@/store/useStore";
import type { CompanySettings, DocumentKind } from "@/types";

const prefixLabels: Record<DocumentKind, string> = {
  quotation: "Quotation",
  salesOrder: "Sales order",
  invoice: "Invoice",
  serviceJob: "Service job",
};

/** Company identity and document defaults. These values print on every quotation, order and invoice. */
const CompanySettingsCard = () => {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [form, setForm] = useState<CompanySettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const set = (patch: Partial<CompanySettings>) => setForm((f) => ({ ...f, ...patch }));
  const text = (key: "name" | "uen" | "gstRegNo" | "phone" | "email") => ({
    id: `co-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value }),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { technicians: _fromUsers, ...values } = form;
    setSaving(true);
    notify(await updateSettings(values), "Company settings saved");
    setSaving(false);
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company information</CardTitle>
          <CardDescription>Printed on quotations, sales orders, tax invoices and service reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="co-name">Company name</Label>
            <Input {...text("name")} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-uen">UEN</Label>
            <Input {...text("uen")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-gstRegNo">GST registration no.</Label>
            <Input {...text("gstRegNo")} placeholder="Leave blank if not GST-registered" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-phone">Phone</Label>
            <Input {...text("phone")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-email">Email</Label>
            <Input {...text("email")} type="email" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-address">Address</Label>
            <Textarea id="co-address" rows={3} value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-bank">Payment / bank details</Label>
            <Textarea id="co-bank" rows={3} value={form.bankDetails} onChange={(e) => set({ bankDetails: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents &amp; billing</CardTitle>
          <CardDescription>Defaults for new documents. Existing documents keep the GST rate they were created with.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="co-gst">GST rate (%)</Label>
              <NumberInput id="co-gst" min={0} max={100} step="0.01" value={form.gstRate} onValueChange={(gstRate) => set({ gstRate })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="co-terms">Payment terms (days)</Label>
              <NumberInput
                id="co-terms"
                min={0}
                value={form.paymentTermsDays}
                onValueChange={(paymentTermsDays) => set({ paymentTermsDays })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="co-validity">Quote validity (days)</Label>
              <NumberInput
                id="co-validity"
                min={1}
                value={form.quotationValidityDays}
                onValueChange={(quotationValidityDays) => set({ quotationValidityDays })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="co-labour">Labour rate (S$/h)</Label>
              <NumberInput
                id="co-labour"
                min={0}
                step="0.01"
                value={form.defaultLabourRate}
                onValueChange={(defaultLabourRate) => set({ defaultLabourRate })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {(Object.keys(prefixLabels) as DocumentKind[]).map((kind) => (
              <div key={kind} className="grid gap-1.5">
                <Label htmlFor={`co-prefix-${kind}`}>{prefixLabels[kind]} prefix</Label>
                <Input
                  id={`co-prefix-${kind}`}
                  value={form.prefixes[kind]}
                  maxLength={8}
                  onChange={(e) => set({ prefixes: { ...form.prefixes, [kind]: e.target.value.toUpperCase() } })}
                  required
                />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="co-qterms">Default quotation terms</Label>
              <Textarea
                id="co-qterms"
                rows={4}
                value={form.quotationTerms}
                onChange={(e) => set({ quotationTerms: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Technicians</Label>
              <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                {form.technicians.length ? form.technicians.join(", ") : "None yet."} Technicians are the active users
                with the Technician role — add or remove them under <strong>Users</strong>.
              </p>
            </div>
          </div>
          <Button type="submit" className="w-fit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
};

export default CompanySettingsCard;
