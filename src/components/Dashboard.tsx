import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  FileSpreadsheet,
  Package,
  Receipt,
  UserCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import {
  addDays,
  balanceDue,
  documentTotals,
  formatDate,
  formatSGD,
  formatSGDAxis,
  formatSGDCompact,
  invoiceDisplayStatus,
  stockStatus,
  todayISO,
} from "@/lib/calc";
import { selectCustomerName, useCan, useStore } from "@/store/useStore";

const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00`).toLocaleDateString("en-SG", {
    month: "short",
    year: "2-digit",
  });

/** Chart tooltip in app tokens so it follows light / dark mode. */
const MoneyTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular font-medium">
        {formatSGD(Number(payload[0].value))}
      </p>
    </div>
  );
};

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 12 },
} as const;

const Dashboard = () => {
  const inventory = useStore((s) => s.inventory);
  const invoices = useStore((s) => s.invoices);
  const quotations = useStore((s) => s.quotations);
  const jobs = useStore((s) => s.jobs);
  const attendance = useStore((s) => s.attendance);
  const customers = useStore((s) => s.customers);
  const userName = useStore((s) => s.user?.name ?? "");
  // Roles without finance access get an operations-only dashboard.
  const finance = useCan("invoices:read");
  const technicianView = !useCan("jobs:manage") && !finance;

  const today = todayISO();
  const issued = invoices.filter((i) => i.status === "Issued");
  const outstanding = issued.reduce(
    (s, i) => s + Math.max(0, balanceDue(i)),
    0,
  );
  const overdue = issued.filter(
    (i) => invoiceDisplayStatus(i, today) === "Overdue",
  );
  const lowStock = inventory.filter((i) =>
    ["Low Stock", "Out of Stock"].includes(stockStatus(i)),
  );
  const openQuotes = quotations.filter(
    (q) =>
      (q.status === "Draft" || q.status === "Sent") && q.validUntil >= today,
  );
  const onSite = attendance.filter((a) => !a.checkOut);

  // Revenue = issued invoices, excl. GST, by invoice month (last 6 months).
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return todayISO(d).slice(0, 7);
  });
  const revenue = months.map((ym) => ({
    month: monthLabel(ym),
    value: issued
      .filter((i) => i.date.startsWith(ym))
      .reduce((s, i) => s + documentTotals(i.lines, i.gstRate).subtotal, 0),
  }));
  const thisMonth = revenue[revenue.length - 1].value;

  // Receivables ageing by days past due.
  const buckets = [
    { label: "Not yet due", min: -Infinity, max: 0 },
    { label: "1–30 days", min: 1, max: 30 },
    { label: "31–60 days", min: 31, max: 60 },
    { label: "60+ days", min: 61, max: Infinity },
  ];
  const daysPastDue = (due: string) =>
    Math.round((Date.parse(today) - Date.parse(due)) / 86_400_000);
  const ageing = buckets.map((b) => ({
    bucket: b.label,
    value: issued
      .filter((i) => {
        const d = daysPastDue(i.dueDate);
        return d >= b.min && d <= b.max;
      })
      .reduce((s, i) => s + Math.max(0, balanceDue(i)), 0),
  }));

  const upcoming = jobs
    .filter(
      (j) =>
        (j.status === "Scheduled" || j.status === "In Progress") &&
        j.dateScheduled <= addDays(today, 7),
    )
    .sort((a, b) =>
      (a.dateScheduled + a.timeScheduled).localeCompare(
        b.dateScheduled + b.timeScheduled,
      ),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Good {new Date().getHours() < 12 ? "morning" : "afternoon"}
          {userName && `, ${userName.split(" ")[0]}`}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here's where the business stands today.
        </p>
      </div>

      {!finance && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label={technicianView ? "My jobs today" : "Jobs today"}
            value={
              jobs.filter(
                (j) =>
                  j.dateScheduled === today &&
                  (!technicianView || j.technician === userName),
              ).length
            }
            icon={CalendarClock}
          />
          <StatCard
            label="In progress"
            value={
              jobs.filter(
                (j) =>
                  j.status === "In Progress" &&
                  (!technicianView || j.technician === userName),
              ).length
            }
            icon={Wrench}
            tone="amber"
          />
          <StatCard
            label="On site now"
            value={onSite.length}
            icon={UserCheck}
            tone="violet"
          />
          <StatCard
            label="Needs reorder"
            value={lowStock.length}
            icon={Package}
            tone={lowStock.length ? "red" : "green"}
          />
        </div>
      )}

      {finance && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue this month"
            value={formatSGDCompact(thisMonth)}
            hint="Issued invoices, excl. GST"
            icon={Receipt}
          />
          <StatCard
            label="Receivables"
            value={formatSGDCompact(outstanding)}
            hint={
              overdue.length ? `${overdue.length} overdue` : "Nothing overdue"
            }
            icon={Wallet}
            tone={overdue.length ? "red" : "green"}
          />
          <StatCard
            label="Open quotations"
            value={formatSGDCompact(
              openQuotes.reduce(
                (s, q) => s + documentTotals(q.lines, q.gstRate).total,
                0,
              ),
            )}
            hint={`${openQuotes.length} awaiting decision`}
            icon={FileSpreadsheet}
            tone="violet"
          />
          <StatCard
            label="Technicians on site"
            value={onSite.length}
            hint={(() => {
              const n = jobs.filter((j) => j.status === "In Progress").length;
              return `${n} job${n === 1 ? "" : "s"} in progress`;
            })()}
            icon={UserCheck}
            tone="amber"
          />
        </div>
      )}

      {finance && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Revenue by month</CardTitle>
              <CardDescription>
                Issued invoices, excl. GST · last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenue} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis
                    {...axisProps}
                    width={60}
                    tickFormatter={formatSGDAxis}
                  />
                  <Tooltip
                    content={<MoneyTooltip />}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Receivables ageing</CardTitle>
              <CardDescription>
                Outstanding balance by days past due
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ageing}
                  layout="vertical"
                  margin={{ left: 0, right: 24 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    {...axisProps}
                    tickFormatter={formatSGDAxis}
                  />
                  <YAxis
                    type="category"
                    dataKey="bucket"
                    {...axisProps}
                    width={96}
                  />
                  <Tooltip
                    content={<MoneyTooltip />}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar
                    dataKey="value"
                    name="Outstanding"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <div
        className={`grid gap-6 ${finance ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" /> Upcoming jobs
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/service">
                All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing scheduled this week.
              </p>
            )}
            {upcoming.map((j) => (
              <div
                key={j.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{j.customer}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(j.dateScheduled)} {j.timeScheduled} ·{" "}
                    {j.technician}
                  </p>
                </div>
                <StatusBadge status={j.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        {finance && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" /> Overdue invoices
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/invoices">
                  All <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdue.length === 0 && (
                <p className="text-sm text-muted-foreground">All caught up.</p>
              )}
              {overdue.slice(0, 5).map((i) => (
                <div
                  key={i.id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {selectCustomerName(customers, i.customerId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i.number} · due {formatDate(i.dueDate)}
                    </p>
                  </div>
                  <span className="tabular font-medium">
                    {formatSGD(balanceDue(i))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Needs reorder
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/inventory">
                All <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Stock levels are healthy.
              </p>
            )}
            {lowStock.slice(0, 5).map((i) => (
              <div
                key={i.id}
                className="flex items-start justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.currentStock} left · reorder at {i.minStock}
                  </p>
                </div>
                <StatusBadge status={stockStatus(i)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
