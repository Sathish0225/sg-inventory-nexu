import { Ionicons } from "@expo/vector-icons";
import { focusManager, QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, Platform, View, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { SessionProvider, useSession } from "~/lib/session";
import { Button, Loading, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true },
  },
});

// Treat "app came back to the foreground" like a browser tab regaining focus: refetch stale data.
function useAppFocusRefetch() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
    return () => sub.remove();
  }, []);
}

onlineManager.setOnline(true);

function Unreachable() {
  const { error, server, retry, switchServer } = useSession();
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl, backgroundColor: c.background }}>
      <Ionicons name="cloud-offline-outline" size={44} color={c.muted} />
      <Text variant="heading" style={{ textAlign: "center" }}>
        Can't reach {server || "the server"}
      </Text>
      <Text muted style={{ textAlign: "center" }}>
        {error}
      </Text>
      <Button title="Try again" icon="refresh" onPress={() => void retry()} style={{ alignSelf: "stretch" }} />
      <Button title="Use another server" tone="secondary" onPress={() => void switchServer()} style={{ alignSelf: "stretch" }} />
    </View>
  );
}

function RootNavigator() {
  const { status } = useSession();
  const c = useColors();
  useAppFocusRefetch();

  if (status === "checking") return <Loading />;
  if (status === "unreachable") return <Unreachable />;

  const signedIn = status === "ready";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text },
        contentStyle: { backgroundColor: c.background },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: "Job" }} />
        <Stack.Screen name="item/[id]" options={{ title: "Item" }} />
        <Stack.Screen name="doc/[kind]/[id]" options={{ title: "Document" }} />
        <Stack.Screen name="scan" options={{ title: "Scan barcode", presentation: "fullScreenModal" }} />
        <Stack.Screen name="customers" options={{ title: "Customers" }} />
        <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
        <Stack.Screen name="password" options={{ title: "Change password", presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
