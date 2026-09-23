import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import type { PrintableDocument } from "@/lib/documents";

/** Same documents as the web app. Print via AirPrint / Android print service. */
export async function printDocument(doc: PrintableDocument) {
  try {
    await Print.printAsync({ html: doc.html });
  } catch (err) {
    Alert.alert("Couldn't print", err instanceof Error ? err.message : String(err));
  }
}

/** Render a PDF and open the share sheet (WhatsApp, email, Files…). */
export async function shareDocumentPdf(doc: PrintableDocument) {
  try {
    if (Platform.OS === "web") return printDocument(doc);
    const { uri } = await Print.printToFileAsync({ html: doc.html });
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing isn't available on this device");
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: doc.title, UTI: "com.adobe.pdf" });
  } catch (err) {
    Alert.alert("Couldn't create the PDF", err instanceof Error ? err.message : String(err));
  }
}
