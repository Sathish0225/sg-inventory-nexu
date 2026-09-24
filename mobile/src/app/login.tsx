import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "~/lib/session";
import { Button, Card, Input, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function Login() {
  const { signIn, server: savedServer, serverChangeRequested } = useSession();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState(savedServer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The server field shows on first sign-in only. Afterwards it's hidden: hold the logo, or tap
  // it 5 times, to change servers. It also appears if the saved server can't be reached.
  const [showServer, setShowServer] = useState(!savedServer || serverChangeRequested);
  const taps = useRef<number[]>([]);
  const revealServer = () => {
    if (showServer) return;
    setShowServer(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const onLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 2000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      revealServer();
    }
  };

  useEffect(() => setServer((s) => s || savedServer), [savedServer]);
  useEffect(() => {
    if (!savedServer || serverChangeRequested) setShowServer(true);
  }, [savedServer, serverChangeRequested]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const failure = await signIn(server, email, password);
    setError(failure);
    setBusy(false);
    if (failure?.startsWith("No InvenTrack server found")) setShowServer(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: space.xl, paddingTop: insets.top + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: space.sm, marginBottom: space.xl }}>
          <Pressable onPress={onLogoTap} onLongPress={revealServer} delayLongPress={900} accessible={false}>
            <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="cube-outline" size={32} color="#fff" />
            </View>
          </Pressable>
          <Text variant="title">InvenTrack SG</Text>
          <Text muted>Sign in to continue</Text>
        </View>
        <Card style={{ gap: space.lg }}>
          {showServer && (
            <Input
              label="Company server"
              hint="Ask your administrator for this address."
              placeholder="inventrack.yourcompany.sg"
              value={server}
              onChangeText={setServer}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              textContentType="URL"
            />
          )}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {error && (
            <View accessibilityRole="alert" style={{ backgroundColor: c.dangerSoft, borderRadius: 10, padding: space.md }}>
              <Text color={c.danger}>{error}</Text>
            </View>
          )}
          <Button title="Sign in" onPress={submit} loading={busy} disabled={!server || !email || !password} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
