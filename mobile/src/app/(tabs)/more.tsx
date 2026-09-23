import Constants from "expo-constants";
import { router } from "expo-router";
import { Platform, View } from "react-native";
import { roleLabels } from "@/lib/permissions";
import { useCan, useSession } from "~/lib/session";
import { Button, Card, ListRow, Screen, SectionTitle, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function More() {
  const { user, server, signOut } = useSession();
  const c = useColors();
  const canCustomers = useCan("customers:read");
  if (!user) return null;
  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Screen>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Text variant="heading" color={c.primary}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{user.name}</Text>
          <Text muted>
            {roleLabels[user.role]} · {user.email}
          </Text>
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Work</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          <ListRow icon="time-outline" title="Attendance & timesheet" onPress={() => router.push("/attendance")} last={!canCustomers} />
          {canCustomers && <ListRow icon="people-outline" title="Customers" onPress={() => router.push("/customers")} last />}
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionTitle>Account</SectionTitle>
        <Card style={{ paddingVertical: 0 }}>
          <ListRow icon="key-outline" title="Change password" onPress={() => router.push("/password")} />
          <ListRow icon="server-outline" title="Server" subtitle={server} last />
        </Card>
      </View>

      <Button title="Sign out" icon="log-out-outline" tone="danger" onPress={() => void signOut()} />
      <Text variant="caption" muted style={{ textAlign: "center" }}>
        InvenTrack SG {Constants.expoConfig?.version ?? ""} · {Platform.OS}
      </Text>
    </Screen>
  );
}
