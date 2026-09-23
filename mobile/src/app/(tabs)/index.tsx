import { router } from "expo-router";
import { View } from "react-native";
import { balanceDue, documentTotals, invoiceDisplayStatus, stockStatus, todayISO, addDays } from "@/lib/calc";
import { useCollection } from "~/lib/data";
import { formatDate, formatSGD, formatSGDCompact, formatTime, greeting } from "~/lib/format";
import { useCan, useSession } from "~/lib/session";
import { Badge, Card, ListRow, Screen, SectionTitle, Stat, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function Home() {
  const { user } = useSession();
  const c = useColors();
  const finance = useCan("invoices:read");
  const manager = useCan("jobs:manage");
  const jobs = useCollection("jobs");
  const attendance = useCollection("attendance");
  const inventory = useCollection("inventory");
  const invoices = useCollection("invoices");
  const quotations = useCollection("quotations");
  const customers = useCollection("customers");

  const today = todayISO();
  const mine = (technician: string) => manager || technician === user?.name;
  const myOpenVisit = attendance.data.find((a) => !a.checkOut && a.technician === user?.name);
  const openVisitJob = myOpenVisit && jobs.data.find((j) => j.id === myOpenVisit.jobId);
  const upcoming = jobs.data
    .filter((j) => (j.status === "Scheduled" || j.status === "In Progress") && j.dateScheduled <= addDays(today, 7) && mine(j.technician))
    .sort((a, b) => (a.dateScheduled + a.timeScheduled).localeCompare(b.dateScheduled + b.timeScheduled))
    .slice(0, 6);
  const lowStock = inventory.data.filter((i) => ["Low Stock", "Out of Stock"].includes(stockStatus(i)));
  const issued = invoices.data.filter((i) => i.status === "Issued");
  const overdue = issued.filter((i) => invoiceDisplayStatus(i, today) === "Overdue");
  const monthPrefix = today.slice(0, 7);
  const revenue = issued.filter((i) => i.date.startsWith(monthPrefix)).reduce((s, i) => s + documentTotals(i.lines, i.gstRate).subtotal, 0);
  const openQuotes = quotations.data.filter((q) => (q.status === "Draft" || q.status === "Sent") && q.validUntil >= today);
  const customerName = (id: string) => customers.data.find((x) => x.id === id)?.name ?? "Customer";

  const refreshing = jobs.refreshing || attendance.refreshing || invoices.refreshing;
  const refresh = () => {
    void jobs.refetch();
    void attendance.refetch();
    void inventory.refetch();
    if (finance) {
      void invoices.refetch();
      void quotations.refetch();
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View>
        <Text variant="title">
          {greeting()}, {user?.name.split(" ")[0]}
        </Text>
        <Text muted>{formatDate(today)}</Text>
      </View>

      {myOpenVisit && openVisitJob && (
        <Card onPress={() => router.push(`/job/${openVisitJob.id}`)} style={{ backgroundColor: c.warningSoft, borderColor: c.warningSoft }}>
          <Text variant="label" color={c.warning}>
            ON SITE SINCE {formatTime(myOpenVisit.checkIn)}
          </Text>
          <Text variant="heading" style={{ marginTop: 4 }}>
            {openVisitJob.jobNumber} · {openVisitJob.customer}
          </Text>
          <Text muted>Tap to check out</Text>
        </Card>
      )}

      {finance ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          <Stat label="Revenue this month" value={formatSGDCompact(revenue)} hint="Excl. GST" icon="trending-up-outline" />
          <Stat
            label="Receivables"
            value={formatSGDCompact(issued.reduce((s, i) => s + Math.max(0, balanceDue(i)), 0))}
            hint={overdue.length ? `${overdue.length} overdue` : "Nothing overdue"}
            icon="wallet-outline"
            tone={overdue.length ? "danger" : "success"}
          />
          <Stat label="Open quotations" value={openQuotes.length} icon="document-text-outline" tone="violet" />
          <Stat label="Needs reorder" value={lowStock.length} icon="alert-circle-outline" tone={lowStock.length ? "warning" : "success"} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
          <Stat
            label={manager ? "Jobs today" : "My jobs today"}
            value={jobs.data.filter((j) => j.dateScheduled === today && mine(j.technician)).length}
            icon="calendar-outline"
          />
          <Stat
            label="In progress"
            value={jobs.data.filter((j) => j.status === "In Progress" && mine(j.technician)).length}
            icon="construct-outline"
            tone="warning"
          />
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <SectionTitle>{manager ? "Upcoming jobs" : "My upcoming jobs"}</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          {upcoming.length === 0 ? (
            <Text muted style={{ paddingVertical: space.lg }}>
              Nothing scheduled this week.
            </Text>
          ) : (
            upcoming.map((j, i) => (
              <ListRow
                key={j.id}
                title={`${j.customer}`}
                subtitle={`${j.jobNumber} · ${formatDate(j.dateScheduled)} ${j.timeScheduled}${manager ? ` · ${j.technician}` : ""}`}
                right={<Badge status={j.status} />}
                onPress={() => router.push(`/job/${j.id}`)}
                last={i === upcoming.length - 1}
              />
            ))
          )}
        </Card>
      </View>

      {finance && overdue.length > 0 && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Overdue invoices</SectionTitle>
          <Card style={{ paddingVertical: 0 }}>
            {overdue.slice(0, 5).map((inv, i) => (
              <ListRow
                key={inv.id}
                title={customerName(inv.customerId)}
                subtitle={`${inv.number} · due ${formatDate(inv.dueDate)}`}
                right={<Text variant="money">{formatSGD(balanceDue(inv))}</Text>}
                onPress={() => router.push(`/doc/invoice/${inv.id}`)}
                last={i === Math.min(overdue.length, 5) - 1}
              />
            ))}
          </Card>
        </View>
      )}

      {lowStock.length > 0 && (
        <View style={{ gap: space.sm }}>
          <SectionTitle>Needs reorder</SectionTitle>
          <Card style={{ paddingVertical: 0 }}>
            {lowStock.slice(0, 5).map((item, i) => (
              <ListRow
                key={item.id}
                title={item.name}
                subtitle={`${item.currentStock} left · reorder at ${item.minStock}`}
                right={<Badge status={stockStatus(item)} />}
                onPress={() => router.push(`/item/${item.id}`)}
                last={i === Math.min(lowStock.length, 5) - 1}
              />
            ))}
          </Card>
        </View>
      )}
    </Screen>
  );
}
