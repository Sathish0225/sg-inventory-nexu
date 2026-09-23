import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { balanceDue, documentTotals, invoiceDisplayStatus, todayISO } from "@/lib/calc";
import type { Quotation } from "@/types";
import { useCollection } from "~/lib/data";
import { formatDate, formatSGD } from "~/lib/format";
import { useCan } from "~/lib/session";
import { Badge, Card, Empty, ListRow, Screen, SearchBar, Segmented, Text } from "~/ui/components";
import { space } from "~/ui/theme";

type Kind = "quotation" | "salesOrder" | "invoice";

const quoteStatus = (q: Quotation, today: string) => (q.status === "Sent" && q.validUntil < today ? "Expired" : q.status);

export default function Sales() {
  const canSales = useCan("sales:read");
  const canInvoices = useCan("invoices:read");
  const [kind, setKind] = useState<Kind>(canInvoices ? "invoice" : "quotation");
  const [search, setSearch] = useState("");
  const quotations = useCollection("quotations");
  const orders = useCollection("salesOrders");
  const invoices = useCollection("invoices");
  const customers = useCollection("customers");
  const today = todayISO();
  const customerName = (id: string) => customers.data.find((c) => c.id === id)?.name ?? "Customer";

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    const match = (number: string, customerId: string, reference: string) =>
      [number, reference, customerName(customerId)].some((v) => v.toLowerCase().includes(term));
    const byDate = <T extends { date: string; number: string }>(a: T, b: T) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number);
    if (kind === "quotation")
      return [...quotations.data].sort(byDate).filter((q) => match(q.number, q.customerId, q.reference)).map((q) => ({
        id: q.id,
        title: customerName(q.customerId),
        subtitle: `${q.number} · ${formatDate(q.date)}`,
        amount: formatSGD(documentTotals(q.lines, q.gstRate).total),
        status: quoteStatus(q, today),
      }));
    if (kind === "salesOrder")
      return [...orders.data].sort(byDate).filter((o) => match(o.number, o.customerId, o.reference)).map((o) => ({
        id: o.id,
        title: customerName(o.customerId),
        subtitle: `${o.number} · delivery ${formatDate(o.deliveryDate)}`,
        amount: formatSGD(documentTotals(o.lines, o.gstRate).total),
        status: o.status,
      }));
    return [...invoices.data].sort(byDate).filter((i) => match(i.number, i.customerId, i.reference)).map((i) => {
      const status = invoiceDisplayStatus(i, today);
      return {
        id: i.id,
        title: customerName(i.customerId),
        subtitle: `${i.number} · due ${formatDate(i.dueDate)}`,
        // Show what's still owed on open invoices; otherwise the invoice total.
        amount: formatSGD(i.status === "Issued" && balanceDue(i) > 0 ? balanceDue(i) : documentTotals(i.lines, i.gstRate).total),
        status,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, search, quotations.data, orders.data, invoices.data, customers.data, today]);

  const options = [
    ...(canSales ? [{ value: "quotation" as const, label: "Quotes" }, { value: "salesOrder" as const, label: "Orders" }] : []),
    ...(canInvoices ? [{ value: "invoice" as const, label: "Invoices" }] : []),
  ];
  const active = kind === "quotation" ? quotations : kind === "salesOrder" ? orders : invoices;

  return (
    <Screen refreshing={active.refreshing} onRefresh={() => void active.refetch()}>
      <Segmented value={kind} onChange={setKind} options={options} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search number, customer, reference…" />
      {rows.length === 0 ? (
        <Empty icon="receipt-outline" title={active.loading ? "Loading…" : "Nothing here"} />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {rows.map((r, i) => (
            <ListRow
              key={r.id}
              title={r.title}
              subtitle={r.subtitle}
              right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text variant="money">{r.amount}</Text>
                  <Badge status={r.status} />
                </View>
              }
              onPress={() => router.push(`/doc/${kind}/${r.id}`)}
              last={i === rows.length - 1}
            />
          ))}
        </Card>
      )}
      <Text variant="caption" muted style={{ textAlign: "center", marginTop: space.sm }}>
        New quotations and invoices are created in the web or desktop app.
      </Text>
    </Screen>
  );
}
