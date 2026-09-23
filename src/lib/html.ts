import { saveFile } from "@/lib/platform";

export { csvCell, escapeHtml, escapeMultiline } from "@/lib/escape";

/** Download a generated file (browser / desktop app). */
export const downloadFile = (filename: string, content: string, type = "text/csv;charset=utf-8") =>
  void saveFile(filename, content, type).catch(() => undefined);
