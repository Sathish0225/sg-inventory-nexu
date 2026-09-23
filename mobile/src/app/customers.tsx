import { useMemo, useState } from "react";
import { Linking, View } from "react-native";
import { balanceDue } from "@/lib/calc";
import { useCollection } from "~/lib/data";
import { formatSGD } from "~/lib/format";
import { Button, Card, Empty, Screen, SearchBar, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function Customers() {
  const customers = useCollection("customers");
  const invoices = useCollection("invoices");
  const c = useColors();
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return customers.data.filter((x) => [x.name, x.contactPerson, x.email, x.phone].some((v) => v.toLowerCase().includes(term)));
  }, [customers.data, search]);
  const outstanding = (id: string) =>
    invoices.data.filter((i) => i.customerId === id && i.status === "Issued").reduce((s, i) => s + Math.max(0, balanceDue(i)), 0);

  return (
    <Screen refreshing={customers.refreshing} onRefresh={() => void customers.refetch()}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search customers…" />
      {rows.length === 0 ? (
        <Empty icon="people-outline" title={customers.loading ? "Loading…" : "No customers"} />
      ) : (
        rows.map((x) => {
          const owed = outstanding(x.id);
          return (
            <Card key={x.id} style={{ gap: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading">{x.name}</Text>
                  {x.contactPerson ? <Text muted>{x.contactPerson}</Text> : null}
                </View>
                {owed > 0 && (
                  <Text variant="money" color={c.warning}>
                    {formatSGD(owed)}
                  </Text>
                )}
              </View>
              {x.billingAddress ? (
                <Text variant="caption" muted>
                  {x.billingAddress}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {x.phone ? (
                  <Button title="Call" icon="call-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${x.phone.replace(/\s+/g, "")}`)} />
                ) : null}
                {x.email ? (
                  <Button title="Email" icon="mail-outline" tone="secondary" style={{ flex: 1 }} onPress={() => void Linking.openURL(`mailto:${x.email}`)} />
                ) : null}
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
