import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@/types";

export type CustomerInput = Omit<Customer, "id" | "createdAt">;

const empty: CustomerInput = { name: "", contactPerson: "", email: "", phone: "", billingAddress: "", uen: "" };

interface CustomerDialogProps {
  open: boolean;
  customer?: Customer | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CustomerInput) => void;
}

const CustomerDialog = ({ open, customer, onOpenChange, onSave }: CustomerDialogProps) => {
  const [form, setForm] = useState<CustomerInput>(empty);
  useEffect(() => {
    if (open) setForm(customer ? { ...empty, ...customer } : empty);
  }, [open, customer]);

  const field = (key: keyof CustomerInput) => ({
    id: `customer-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ ...form, name: form.name.trim() });
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="customer-name">Company / name</Label>
            <Input {...field("name")} required autoFocus />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="customer-contactPerson">Contact person</Label>
              <Input {...field("contactPerson")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="customer-uen">UEN</Label>
              <Input {...field("uen")} placeholder="e.g. 201912345K" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="customer-email">Email</Label>
              <Input {...field("email")} type="email" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input {...field("phone")} type="tel" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-billingAddress">Billing address</Label>
            <Textarea {...field("billingAddress")} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{customer ? "Save changes" : "Add customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
