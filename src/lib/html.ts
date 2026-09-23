import { saveFile } from "@/lib/platform";

/** Escape user-entered text before interpolating it into generated HTML documents. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Escape, then keep line breaks (addresses, notes). */
export const escapeMultiline = (value: unknown): string => escapeHtml(value).replace(/\n/g, "<br/>");

/** Quote a value for CSV export; neutralise text that spreadsheets would run as a formula. */
export const csvCell = (value: unknown): string => {
  let s = String(value ?? "");
  if (typeof value === "string" && /^[=+@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Download (browser / desktop) or share (phone) a generated file. */
export const downloadFile = (filename: string, content: string, type = "text/csv;charset=utf-8") =>
  void saveFile(filename, content, type).catch(() => undefined);
