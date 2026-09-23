import { formatDate } from "@/lib/calc";

export { formatDate, formatHours, formatSGD, formatSGDCompact } from "@/lib/calc";

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });

export const formatDayTime = (iso: string) => `${formatDate(iso.slice(0, 10))} ${formatTime(iso)}`;

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
