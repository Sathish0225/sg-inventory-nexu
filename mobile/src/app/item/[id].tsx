import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { stockStatus } from "@/lib/calc";
import { api, useAction, useCollection } from "~/lib/data";
import { formatDayTime, formatSGD } from "~/lib/format";
import { useCan } from "~/lib/session";
import { Badge, Button, Card, Empty, Input, KeyValue, ListRow, Screen, SectionTitle, Segmented, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const inventory = useCollection("inventory");
  const movements = useCollection("stockMovements");
  const canWrite = useCan("inventory:write");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("1");
  const [reference, setReference] = useState("");

  const item = inventory.data.find((i) => i.id === id);
  const adjust = useAction(
    (args: { delta: number; reference: string }) => api.post(`/inventory/${id}/adjust`, args),
    ["inventory", "stockMovements"],
  );
  if (!item) return <Empty icon="cube-outline" title={inventory.loading ? "Loading…" : "Item not found"} />;

  const quantity = Number(qty);
  const valid = Number.isFinite(quantity) && quantity > 0;
  const submit = async () => {
    const r = await adjust.run({ delta: direction === "in" ? quantity : -quantity, reference: reference.trim() });
    if (r.ok) {
      setQty("1");
      setReference("");
    }
  };
  const history = movements.data.filter((m) => m.itemId === id).slice(0, 10);

  return (
    <Screen refreshing={inventory.refreshing} onRefresh={() => void Promise.all([inventory.refetch(), movements.refetch()])}>
      <Stack.Screen options={{ title: item.sku }} />
      <Card style={{ gap: space.sm }}>
        <Badge status={stockStatus(item)} />
        <Text variant="heading">{item.name}</Text>
        <Text muted>
          {item.brand} {item.model}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm, marginTop: space.sm }}>
          <Text variant="title" style={{ fontSize: 36 }}>
            {item.currentStock}
          </Text>
          <Text muted>in stock · reorder at {item.minStock}</Text>
        </View>
      </Card>

      <Card style={{ gap: space.md }}>
        <KeyValue label="Location" value={item.location} />
        {item.serialNumber ? <KeyValue label="Serial" value={item.serialNumber} /> : null}
        <KeyValue label="Category" value={item.category} />
        <KeyValue label="Selling price" value={formatSGD(item.unitPrice)} />
        {canWrite && <KeyValue label="Unit cost" value={formatSGD(item.unitCost)} />}
        {item.assignedTo ? <KeyValue label="Assigned to" value={item.assignedTo} /> : null}
      </Card>

      {canWrite && (
        <Card style={{ gap: space.md }}>
          <Text variant="heading">Record movement</Text>
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: "in", label: "Stock in" },
              { value: "out", label: "Stock out" },
            ]}
          />
          <Input label="Quantity" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
          <Input
            label="Reference"
            value={reference}
            onChangeText={setReference}
            placeholder={direction === "in" ? "Supplier PO / DO number" : "Issued to / job number"}
          />
          <Button
            title={direction === "in" ? `Add ${valid ? quantity : ""}` : `Remove ${valid ? quantity : ""}`}
            icon={direction === "in" ? "add-circle-outline" : "remove-circle-outline"}
            onPress={submit}
            loading={adjust.busy}
            disabled={!valid}
          />
        </Card>
      )}

      <View style={{ gap: space.sm }}>
        <SectionTitle>Recent movements</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          {history.length === 0 ? (
            <Text muted style={{ paddingVertical: space.lg }}>
              No recent movements.
            </Text>
          ) : (
            history.map((m, i) => (
              <ListRow
                key={m.id}
                title={m.reference || (m.quantity > 0 ? "Stock in" : "Stock out")}
                subtitle={`${formatDayTime(m.at)}${m.note ? ` · ${m.note}` : ""}`}
                right={
                  <Text variant="money" color={m.quantity > 0 ? c.success : c.warning}>
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </Text>
                }
                last={i === history.length - 1}
              />
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}
