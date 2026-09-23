import type { CapacitorConfig } from "@capacitor/cli";

// Mobile apps (Android / iOS). The web build in dist/ is bundled into the app; it talks to the
// company server chosen at sign-in (see src/lib/platform.ts). Build: npm run mobile:sync
const config: CapacitorConfig = {
  appId: "sg.inventrack.app",
  appName: "InvenTrack SG",
  webDir: "dist",
  android: {
    // The API must be served over HTTPS; plain-http servers are blocked as mixed content.
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: { overlaysWebView: true },
  },
};

export default config;
