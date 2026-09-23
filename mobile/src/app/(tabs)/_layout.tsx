import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useCan } from "~/lib/session";
import { useColors } from "~/ui/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;

export default function TabsLayout() {
  const c = useColors();
  const canSales = useCan("sales:read");
  const canInvoices = useCan("invoices:read");
  const sales = canSales || canInvoices;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.card },
        headerTitleStyle: { color: c.text },
        sceneStyle: { backgroundColor: c.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: icon("construct-outline") }} />
      <Tabs.Screen name="stock" options={{ title: "Stock", tabBarIcon: icon("cube-outline") }} />
      <Tabs.Screen name="sales" options={{ title: "Sales", tabBarIcon: icon("receipt-outline"), href: sales ? undefined : null }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("ellipsis-horizontal-circle-outline") }} />
    </Tabs>
  );
}
