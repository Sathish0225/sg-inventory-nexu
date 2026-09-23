import { Capacitor } from "@capacitor/core";

/**
 * The same React app runs in three shells:
 *  - web:     served by the API; same-origin requests with an httpOnly session cookie
 *  - desktop: Electron (see desktop/); bundled app, talks to a configured server with a bearer token
 *  - ios / android: Capacitor (see capacitor.config.ts); same as desktop
 * Everything shell-specific goes through this module.
 */

export type Platform = "web" | "desktop" | "ios" | "android";

/** Bridge exposed by desktop/preload.cjs (contextIsolation keeps Node out of the page). */
interface DesktopBridge {
  version: string;
  os: string;
  store: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    remove(key: string): Promise<void>;
  };
}

declare global {
  interface Window {
    inventrackDesktop?: DesktopBridge;
  }
}

const desktop = typeof window !== "undefined" ? window.inventrackDesktop : undefined;

export const platform: Platform = desktop
  ? "desktop"
  : Capacitor.isNativePlatform()
    ? (Capacitor.getPlatform() as "ios" | "android")
    : "web";

/** True in the installable apps, which connect to a company server chosen at sign-in. */
export const isApp = platform !== "web";
export const isMobileApp = platform === "ios" || platform === "android";

/**
 * Persistent key/value storage for the server address and sign-in token.
 * Desktop: encrypted with the OS keychain (Electron safeStorage). Mobile: app-private storage.
 */
export const appStorage = {
  async get(key: string): Promise<string | null> {
    if (desktop) return desktop.store.get(key);
    if (isMobileApp) {
      const { Preferences } = await import("@capacitor/preferences");
      return (await Preferences.get({ key })).value;
    }
    return null;
  },
  async set(key: string, value: string): Promise<void> {
    if (desktop) return desktop.store.set(key, value);
    if (isMobileApp) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    }
  },
  async remove(key: string): Promise<void> {
    if (desktop) return desktop.store.remove(key);
    if (isMobileApp) {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key });
    }
  },
};

/** "inventrack.mycompany.sg" → "https://inventrack.mycompany.sg" (no trailing slash). */
export function normaliseServerUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

/**
 * Save or share a generated file. Browsers and the desktop app download it (desktop shows a save
 * dialog); phones write it to the cache and open the share sheet (Files, email, WhatsApp, print…).
 */
export async function saveFile(filename: string, content: string, type: string): Promise<void> {
  if (isMobileApp) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, url: uri });
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export interface GeoFix {
  lat: number;
  lng: number;
}

/**
 * Best-effort GPS fix, or null. Phones use the native location service (proper permission
 * prompt). The whole wait is capped: a browser's own timeout only starts after the permission
 * prompt is answered, so an ignored prompt would otherwise hang forever.
 */
export async function getLocation(maxWaitMs = 10_000): Promise<GeoFix | null> {
  const giveUp = new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs));
  const attempt = (async (): Promise<GeoFix | null> => {
    try {
      if (isMobileApp) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const permission = await Geolocation.requestPermissions({ permissions: ["location"] });
        if (permission.location === "denied") return null;
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      if (!("geolocation" in navigator)) return null;
      return await new Promise<GeoFix | null>((resolve) =>
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
        ),
      );
    } catch {
      return null;
    }
  })();
  return Promise.race([attempt, giveUp]);
}

/** Desktops rarely have GPS; phones should record location by default. */
export const locationCaptureDefault = platform !== "desktop";
