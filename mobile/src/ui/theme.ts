import { useColorScheme } from "react-native";

// Design tokens mirroring the web app (blue brand, slate neutrals), with a dark variant.

const light = {
  background: "#f4f6fa",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  primary: "#2563eb",
  primaryText: "#ffffff",
  primarySoft: "#dbeafe",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  success: "#059669",
  successSoft: "#d1fae5",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  violet: "#7c3aed",
  violetSoft: "#ede9fe",
  input: "#f8fafc",
};

const dark: typeof light = {
  background: "#0b1120",
  card: "#131b2e",
  text: "#f1f5f9",
  muted: "#94a3b8",
  border: "#1f2a40",
  primary: "#3b82f6",
  primaryText: "#ffffff",
  primarySoft: "#1e3a8a",
  danger: "#f87171",
  dangerSoft: "#450a0a",
  success: "#34d399",
  successSoft: "#064e3b",
  warning: "#fbbf24",
  warningSoft: "#451a03",
  violet: "#a78bfa",
  violetSoft: "#2e1065",
  input: "#0f1729",
};

export type Colors = typeof light;

export const useColors = (): Colors => (useColorScheme() === "dark" ? dark : light);

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
