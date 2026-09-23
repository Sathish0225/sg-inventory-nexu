import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/store/useStore";
import CustomerDialog from "./CustomerDialog";

interface CustomerSelectProps {
  id?: string;
  value: string;
  onChange: (customerId: string) => void;
  disabled?: boolean;
}

/** Customer picker with inline "new customer" so users don't lose the document they're editing. */
const CustomerSelect = ({ id, value, onChange, disabled }: CustomerSelectProps) => {
  const customers = useStore((s) => s.customers);
  const addCustomer = useStore((s) => s.addCustomer);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="flex-1">
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!disabled && (
        <Button type="button" variant="outline" size="icon" aria-label="New customer" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      )}
      <CustomerDialog
        open={adding}
        onOpenChange={setAdding}
        onSave={(input) => {
          onChange(addCustomer(input).id);
          setAdding(false);
        }}
      />
    </div>
  );
};

export default CustomerSelect;
