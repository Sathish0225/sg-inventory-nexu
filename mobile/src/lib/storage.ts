import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Sign-in token and server address. On phones this is the iOS Keychain / Android Keystore-backed
 * SecureStore. The web target (used only for development and testing) falls back to localStorage.
 */
export const secureStorage = {
  get: async (key: string): Promise<string | null> =>
    Platform.OS === "web" ? globalThis.localStorage?.getItem(key) ?? null : SecureStore.getItemAsync(key),
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string): Promise<void> => {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
