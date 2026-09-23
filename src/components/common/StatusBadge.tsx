import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // neutral
  Draft: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Pending: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Void: "bg-slate-500/10 text-slate-500 line-through",
  Cancelled: "bg-slate-500/10 text-slate-500",
  // in flight
  Sent: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Scheduled: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Unpaid: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Assigned: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "In Progress": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Partially Paid": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Low Stock": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "On Site": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  // good
  Accepted: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Fulfilled: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "In Stock": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Checked Out": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  // bad
  Rejected: "bg-red-500/10 text-red-700 dark:text-red-300",
  Expired: "bg-red-500/10 text-red-700 dark:text-red-300",
  Overdue: "bg-red-500/10 text-red-700 dark:text-red-300",
  "Out of Stock": "bg-red-500/10 text-red-700 dark:text-red-300",
  High: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
      styles[status] ?? "bg-muted text-muted-foreground",
      className,
    )}
  >
    {status}
  </span>
);

export default StatusBadge;
