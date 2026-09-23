import {
  inventoryReportDocument,
  invoiceDocument,
  quotationDocument,
  salesOrderDocument,
  serviceReportDocument,
  type PrintableDocument,
} from "@/lib/documents";

// Web / desktop printing: render the document into a hidden iframe and open the print dialog,
// where users can print or "Save as PDF".

export function printHtml({ html }: PrintableDocument) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const win = iframe.contentWindow!;
  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);
  // Give the iframe a tick to lay out before opening the dialog.
  setTimeout(() => {
    win.focus();
    win.print();
    // Browsers that don't fire afterprint still get cleaned up eventually.
    setTimeout(cleanup, 60_000);
  }, 50);
}

export const printQuotation = (...args: Parameters<typeof quotationDocument>) => printHtml(quotationDocument(...args));
export const printSalesOrder = (...args: Parameters<typeof salesOrderDocument>) => printHtml(salesOrderDocument(...args));
export const printInvoice = (...args: Parameters<typeof invoiceDocument>) => printHtml(invoiceDocument(...args));
export const printServiceReport = (...args: Parameters<typeof serviceReportDocument>) =>
  printHtml(serviceReportDocument(...args));
export const printInventoryReport = (...args: Parameters<typeof inventoryReportDocument>) =>
  printHtml(inventoryReportDocument(...args));
