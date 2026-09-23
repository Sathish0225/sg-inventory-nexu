import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useCollection } from "~/lib/data";
import { Button, Loading, Text } from "~/ui/components";
import { space } from "~/ui/theme";

/** Scan a barcode / QR code and open the matching item (by SKU or serial number). */
export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const inventory = useCollection("inventory");
  const handled = useRef(false);
  const [torch, setTorch] = useState(false);

  if (!permission) return <Loading />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: space.lg, padding: space.xl }}>
        <Text variant="heading" style={{ textAlign: "center" }}>
          Camera access is needed to scan barcodes
        </Text>
        <Button title="Allow camera" icon="camera-outline" onPress={() => void requestPermission()} />
        <Button title="Cancel" tone="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    const code = data.trim().toLowerCase();
    const item = inventory.data.find((i) => i.sku.toLowerCase() === code || (i.serialNumber && i.serialNumber.toLowerCase() === code));
    void Haptics.notificationAsync(item ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    if (item) {
      router.replace(`/item/${item.id}`);
    } else {
      Alert.alert("No matching item", `Nothing in stock has the SKU or serial number "${data}".`, [
        { text: "Scan again", onPress: () => (handled.current = false) },
        { text: "Close", style: "cancel", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e", "datamatrix"] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.frame} pointerEvents="none" />
      <View style={styles.controls}>
        <Text color="#fff" style={{ textAlign: "center" }}>
          Point the camera at the item's barcode
        </Text>
        <View style={{ flexDirection: "row", gap: space.sm }}>
          <Button title={torch ? "Light off" : "Light on"} icon="flashlight-outline" tone="secondary" style={{ flex: 1 }} onPress={() => setTorch(!torch)} />
          <Button title="Close" tone="secondary" style={{ flex: 1 }} onPress={() => router.back()} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: "30%",
    left: "12%",
    right: "12%",
    height: "22%",
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 16,
  },
  controls: { position: "absolute", left: space.lg, right: space.lg, bottom: space.xl * 2, gap: space.md },
});
