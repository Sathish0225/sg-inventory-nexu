import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { stockStatus } from "@/lib/calc";
import { useCollection } from "~/lib/data";
import { Badge, Button, Card, Empty, ListRow, Screen, SearchBar, Segmented, Text } from "~/ui/components";
import { space } from "~/ui/theme";

export default function Stock() {
  const inventory = useCollection("inventory");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "reorder">("all");

  const rows = useMemo(() => {
    const term = search.toLowerCase();
    return inventory.data
      .filter((i) => [i.name, i.sku, i.serialNumber, i.brand, i.location].some((v) => v.toLowerCase().includes(term)))
      .filter((i) => filter === "all" || ["Low Stock", "Out of Stock"].includes(stockStatus(i)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory.data, search, filter]);

  return (
    <Screen refreshing={inventory.refreshing} onRefresh={() => void inventory.refetch()}>
      <Button title="Scan barcode" icon="barcode-outline" onPress={() => router.push("/scan")} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, SKU, serial, location…" />
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All items" },
          { value: "reorder", label: "Needs reorder" },
        ]}
      />
      {rows.length === 0 ? (
        <Empty icon="cube-outline" title={inventory.loading ? "Loading…" : "No items"} />
      ) : (
        <Card style={{ paddingVertical: 0 }}>
          {rows.map((item, i) => (
            <ListRow
              key={item.id}
              title={item.name}
              subtitle={`${item.sku} · ${item.location}`}
              right={
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text variant="money">{item.currentStock}</Text>
                  <Badge status={stockStatus(item)} />
                </View>
              }
              onPress={() => router.push(`/item/${item.id}`)}
              last={i === rows.length - 1}
            />
          ))}
        </Card>
      )}
      <Text variant="caption" muted style={{ textAlign: "center", marginTop: space.sm }}>
        {rows.length} of {inventory.data.length} items
      </Text>
    </Screen>
  );
}
