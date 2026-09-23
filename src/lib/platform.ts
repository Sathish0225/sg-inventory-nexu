/**
 * This React app runs in two shells:
 *  - web:     served by the API; same-origin requests with an httpOnly session cookie
 *  - desktop: Electron (see desktop/); bundled app, talks to a configured server with a bearer token
 * The phone apps are a separate React Native (Expo) project in mobile/.
 * Everything shell-specific goes through this module.
 */

export type Platform = "web" | "desktop";

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

export const platform: Platform = desktop ? "desktop" : "web";

/** True in the desktop app, which connects to a company server chosen at sign-in. */
export const isApp = platform !== "web";

/** Persistent storage for the server address and sign-in token (desktop: OS-keychain encrypted). */
export const appStorage = {
  get: async (key: string): Promise<string | null> => (desktop ? desktop.store.get(key) : null),
  set: async (key: string, value: string): Promise<void> => {
    if (desktop) await desktop.store.set(key, value);
  },
  remove: async (key: string): Promise<void> => {
    if (desktop) await desktop.store.remove(key);
  },
};

/** "inventrack.mycompany.sg" → "https://inventrack.mycompany.sg" (no trailing slash). */
export function normaliseServerUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

/** Download a generated file (the desktop app shows a save dialog). */
export async function saveFile(filename: string, content: string, type: string): Promise<void> {
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
 * Best-effort GPS fix, or null. The whole wait is capped: a browser's own timeout only starts
 * after the permission prompt is answered, so an ignored prompt would otherwise hang forever.
 */
export async function getLocation(maxWaitMs = 10_000): Promise<GeoFix | null> {
  if (!("geolocation" in navigator)) return null;
  const giveUp = new Promise<null>((resolve) => setTimeout(() => resolve(null), maxWaitMs));
  const attempt = new Promise<GeoFix | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    ),
  );
  return Promise.race([attempt, giveUp]);
}

/** Desktops rarely have GPS; browsers on phones and tablets should record location by default. */
export const locationCaptureDefault = platform !== "desktop";
