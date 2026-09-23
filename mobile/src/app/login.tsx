import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "~/lib/session";
import { Button, Card, Input, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function Login() {
  const { signIn, server: savedServer } = useSession();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState(savedServer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setServer((s) => s || savedServer), [savedServer]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setError(await signIn(server, email, password));
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: space.xl, paddingTop: insets.top + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: "center", gap: space.sm, marginBottom: space.xl }}>
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="cube-outline" size={32} color="#fff" />
          </View>
          <Text variant="title">InvenTrack SG</Text>
          <Text muted>Sign in to continue</Text>
        </View>
        <Card style={{ gap: space.lg }}>
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
