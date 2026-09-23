import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CalendarClock, FileSpreadsheet, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, balanceDue, formatDate, formatSGD, invoiceDisplayStatus, stockStatus, todayISO } from "@/lib/calc";
import { selectCustomerName, useStore } from "@/store/useStore";

interface Alert {
  id: string;
  icon: typeof Bell;
  tone: string;
  title: string;
  message: string;
  to: string;
}

/**
 * Alerts derived from live data, so they clear themselves once the underlying issue is fixed
 * (stock replenished, invoice paid, quotation decided).
 */
const useAlerts = (): Alert[] => {
  const inventory = useStore((s) => s.inventory);
  const invoices = useStore((s) => s.invoices);
  const quotations = useStore((s) => s.quotations);
  const jobs = useStore((s) => s.jobs);
  const customers = useStore((s) => s.customers);

  return useMemo(() => {
    const today = todayISO();
    const alerts: Alert[] = [];
    for (const inv of invoices) {
      if (invoiceDisplayStatus(inv, today) === "Overdue") {
        alerts.push({
          id: `inv-${inv.id}`,
          icon: AlertTriangle,
          tone: "text-red-600 dark:text-red-400",
          title: `${inv.number} is overdue`,
          message: `${selectCustomerName(customers, inv.customerId)} · ${formatSGD(balanceDue(inv))} due ${formatDate(inv.dueDate)}`,
          to: "/invoices",
        });
      }
    }
    for (const item of inventory) {
      const status = stockStatus(item);
      if (status === "Low Stock" || status === "Out of Stock") {
        alerts.push({
          id: `stock-${item.id}`,
          icon: Package,
          tone: "text-amber-600 dark:text-amber-400",
          title: `${item.name}: ${status.toLowerCase()}`,
          message: `${item.currentStock} left, reorder level ${item.minStock}`,
          to: "/inventory",
        });
      }
    }
    for (const q of quotations) {
      if (q.status === "Sent" && q.validUntil >= today && q.validUntil <= addDays(today, 3)) {
        alerts.push({
          id: `qt-${q.id}`,
          icon: FileSpreadsheet,
          tone: "text-violet-600 dark:text-violet-400",
          title: `${q.number} expires soon`,
          message: `${selectCustomerName(customers, q.customerId)} · valid until ${formatDate(q.validUntil)}`,
          to: "/quotations",
        });
      }
    }
    for (const j of jobs) {
      if (j.status === "Scheduled" && j.dateScheduled === today) {
        alerts.push({
          id: `job-${j.id}`,
          icon: CalendarClock,
          tone: "text-blue-600 dark:text-blue-400",
          title: `${j.jobNumber} today at ${j.timeScheduled}`,
          message: `${j.customer} · ${j.technician}`,
          to: "/service",
        });
      }
    }
    return alerts;
  }, [inventory, invoices, quotations, jobs, customers]);
};

const NotificationSystem = () => {
  const alerts = useAlerts();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`${alerts.length} alerts`}>
          <Bell className="h-4 w-4" />
          {alerts.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Alerts</p>
          <p className="text-xs text-muted-foreground">Things that need attention right now</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">All clear.</p>
          ) : (
            alerts.map((a) => (
              <Link
                key={a.id}
                to={a.to}
                onClick={() => setOpen(false)}
                className="flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted"
              >
                <a.icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.message}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationSystem;
