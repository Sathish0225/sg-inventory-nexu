import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import NumberInput from "@/components/common/NumberInput";
import CustomerSelect from "@/components/sales/CustomerSelect";
import { formatSGD, partsTotal, todayISO } from "@/lib/calc";
import { useStore, type NewServiceJob } from "@/store/useStore";
import type { JobPriority, JobStatus, PartUsed, ServiceJob, ServiceType } from "@/types";

const serviceTypes: ServiceType[] = ["Preventive Maintenance", "Corrective Maintenance", "Installation", "Emergency Repair"];
const priorities: JobPriority[] = ["Low", "Medium", "High"];
const statuses: JobStatus[] = ["Scheduled", "In Progress", "Completed", "Cancelled"];
const CUSTOM = "__custom";

interface ServiceFormProps {
  open: boolean;
  job: ServiceJob | null;
  /** Prefill for quick actions such as "Emergency service". */
  preset?: Partial<NewServiceJob>;
  /** Technician editing their own job: only status, parts and notes can change. */
  restricted?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewServiceJob) => void;
}

const ServiceForm = ({ open, job, preset, restricted = false, onOpenChange, onSave }: ServiceFormProps) => {
  const inventory = useStore((s) => s.inventory);
  const settings = useStore((s) => s.settings);
  const customers = useStore((s) => s.customers);

  const blank = (): NewServiceJob => ({
    jobNumber: "",
    customerId: null,
    customer: "",
    site: "",
    serviceType: "Preventive Maintenance",
    technician: settings.technicians[0] ?? "",
    dateScheduled: todayISO(),
    timeScheduled: "09:00",
    status: "Scheduled",
    priority: "Medium",
    description: "",
    partsUsed: [],
    labourRate: settings.defaultLabourRate,
    customerSignature: false,
    photos: 0,
    notes: "",
    ...preset,
  });

  const [form, setForm] = useState<NewServiceJob>(blank);
  useEffect(() => {
    if (open) setForm(job ? { ...job } : blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<NewServiceJob>) => setForm((f) => ({ ...f, ...patch }));
  const partsLocked = Boolean(job?.partsDeducted);

  const updatePart = (index: number, patch: Partial<PartUsed>) =>
    set({ partsUsed: form.partsUsed.map((p, i) => (i === index ? { ...p, ...patch } : p)) });

  const pickPart = (index: number, itemId: string) => {
    if (itemId === CUSTOM) return updatePart(index, { itemId: null });
    const item = inventory.find((i) => i.id === itemId);
    if (item) updatePart(index, { itemId, item: item.name, cost: item.unitPrice });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job ? `Edit ${job.jobNumber}` : "New service job"}</DialogTitle>
          <DialogDescription>
            Parts linked to inventory are deducted from stock when the job is marked completed.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, partsUsed: form.partsUsed.filter((p) => p.item.trim() && p.quantity > 0) });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="job-number">Job number</Label>
              <Input
                id="job-number"
                value={form.jobNumber ?? ""}
                placeholder="Auto"
                onChange={(e) => set({ jobNumber: e.target.value })}
                disabled={Boolean(job)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set({ priority: v as JobPriority })} disabled={restricted}>
                <SelectTrigger id="job-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-status">Status</Label>
              <Select value={form.status} onValueChange={(v) => set({ status: v as JobStatus })}>
                <SelectTrigger id="job-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="job-customer">Customer</Label>
              <CustomerSelect
                id="job-customer"
                disabled={restricted}
                value={form.customerId ?? ""}
                onChange={(customerId) =>
                  set({ customerId, customer: customers.find((c) => c.id === customerId)?.name ?? form.customer })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-site">Site location</Label>
              <Input id="job-site" value={form.site} onChange={(e) => set({ site: e.target.value })} required disabled={restricted} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-type">Service type</Label>
              <Select value={form.serviceType} onValueChange={(v) => set({ serviceType: v as ServiceType })} disabled={restricted}>
                <SelectTrigger id="job-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-tech">Technician</Label>
              <Select value={form.technician} onValueChange={(technician) => set({ technician })} disabled={restricted}>
                <SelectTrigger id="job-tech">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {settings.technicians.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="job-date">Date</Label>
                <Input
                  id="job-date"
                  type="date"
                  value={form.dateScheduled}
                  onChange={(e) => set({ dateScheduled: e.target.value })}
                  required
                  disabled={restricted}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="job-time">Time</Label>
                <Input
                  id="job-time"
                  type="time"
                  value={form.timeScheduled}
                  onChange={(e) => set({ timeScheduled: e.target.value })}
                  required
                  disabled={restricted}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="job-rate">Labour rate (S$/hour)</Label>
              <NumberInput
                id="job-rate"
                min={0}
                step="0.01"
                value={form.labourRate}
                onValueChange={(labourRate) => set({ labourRate })}
                disabled={restricted}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="job-desc">Description</Label>
            <Textarea
              id="job-desc"
              rows={2}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              required
              disabled={restricted}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Parts used</Label>
              <span className="tabular text-sm text-muted-foreground">{formatSGD(partsTotal(form))}</span>
            </div>
            {partsLocked && (
              <p className="text-xs text-muted-foreground">Parts were deducted from stock on completion and are locked.</p>
            )}
            {form.partsUsed.map((part, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-2 sm:grid-cols-[12rem_1fr_5rem_6rem_auto]">
                <Select value={part.itemId ?? CUSTOM} onValueChange={(v) => pickPart(index, v)} disabled={partsLocked}>
                  <SelectTrigger className="col-span-4 sm:col-span-1" aria-label="Inventory item">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CUSTOM}>Non-stock item</SelectItem>
                    {inventory.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.name} ({i.currentStock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label="Part description"
                  value={part.item}
                  onChange={(e) => updatePart(index, { item: e.target.value })}
                  disabled={partsLocked}
                />
                <NumberInput
                  aria-label="Quantity"
                  min={0}
                  value={part.quantity}
                  onValueChange={(quantity) => updatePart(index, { quantity })}
                  disabled={partsLocked}
                />
                <NumberInput
                  aria-label="Price"
                  min={0}
                  step="0.01"
                  value={part.cost}
                  onValueChange={(cost) => updatePart(index, { cost })}
                  disabled={partsLocked}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove part"
                  disabled={partsLocked}
                  onClick={() => set({ partsUsed: form.partsUsed.filter((_, i) => i !== index) })}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {!partsLocked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => set({ partsUsed: [...form.partsUsed, { itemId: null, item: "", quantity: 1, cost: 0 }] })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add part
              </Button>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="job-notes">Technician notes</Label>
            <Textarea id="job-notes" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.customerId || !form.technician}>
              {job ? "Save changes" : "Create job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
