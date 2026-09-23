import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { useSession } from "~/lib/session";
import { Button, Input, Screen, Text } from "~/ui/components";
import { space, useColors } from "~/ui/theme";

export default function ChangePassword() {
  const { changePassword } = useSession();
  const c = useColors();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 10) return setError("The new password must be at least 10 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    setBusy(true);
    const failure = await changePassword(current, next);
    setBusy(false);
    if (failure) return setError(failure);
    Alert.alert("Password changed", "You've been signed out on your other devices.");
    router.back();
  };

  return (
    <Screen>
      <Input label="Current password" value={current} onChangeText={setCurrent} secureTextEntry textContentType="password" />
      <Input label="New password" hint="At least 10 characters." value={next} onChangeText={setNext} secureTextEntry textContentType="newPassword" />
      <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry textContentType="newPassword" />
      {error && (
        <View accessibilityRole="alert" style={{ backgroundColor: c.dangerSoft, borderRadius: 10, padding: space.md }}>
          <Text color={c.danger}>{error}</Text>
        </View>
      )}
      <Button title="Change password" onPress={submit} loading={busy} disabled={!current || !next || !confirm} />
    </Screen>
  );
}
