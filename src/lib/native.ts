import { isMobileApp } from "@/lib/platform";
import { useStore } from "@/store/useStore";

/** Phone-only integration: hardware back button, status bar, and fresh data on resume. */
export async function initNativeShell() {
  if (!isMobileApp) return;
  const [{ App }, { StatusBar, Style }] = await Promise.all([import("@capacitor/app"), import("@capacitor/status-bar")]);

  // Android back button: close the open dialog / go back a page, and leave the app from the top.
  await App.addListener("backButton", ({ canGoBack }) => {
    const openDialog = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if (openDialog) {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else if (canGoBack && window.location.pathname !== "/") {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });

  // Coming back to the app (e.g. after a phone call): pick up what colleagues changed meanwhile.
  await App.addListener("resume", () => {
    if (useStore.getState().status === "ready") void useStore.getState().refresh().catch(() => undefined);
  });

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
}
