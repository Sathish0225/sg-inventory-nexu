import {
  amountPaid,
  attendanceHours,
  balanceDue,
  documentTotals,
  formatDate,
  formatDateTime,
  formatHours,
  formatSGD,
  lineNet,
  partsTotal,
  stockStatus,
} from "@/lib/calc";
import { escapeHtml as e, escapeMultiline as ml } from "@/lib/html";
import type {
  AttendanceRecord,
  CompanySettings,
  Customer,
  InventoryItem,
  Invoice,
  Quotation,
  SalesOrder,
  ServiceJob,
} from "@/types";

// Documents are rendered to standalone HTML and printed from a hidden iframe, so users can
// print or "Save as PDF" from the browser dialog. Every interpolated value is escaped.

const styles = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0; letter-spacing: 0.04em; }
  h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; margin: 24px 0 8px; }
  .row { display: flex; justify-content: space-between; gap: 24px; }
  .muted { color: #64748b; }
  .brand { font-size: 16px; font-weight: 700; color: #1d4ed8; }
  .doc-title { text-align: right; }
  .meta td { padding: 2px 0 2px 16px; }
  .meta td:first-child { color: #64748b; padding-left: 0; }
  table.lines { width: 100%; border-collapse: collapse; margin-top: 16px; }
  table.lines th { text-align: left; background: #f1f5f9; padding: 8px; font-size: 11px; text-transform: uppercase; color: #475569; }
  table.lines td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.lines th.num { text-align: right; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { margin-left: auto; margin-top: 12px; width: 300px; }
  .totals td { padding: 4px 8px; }
  .totals .grand td { border-top: 2px solid #0f172a; font-weight: 700; font-size: 14px; }
  .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
  .sign { display: flex; gap: 32px; margin-top: 48px; }
  .sign div { flex: 1; border-top: 1px solid #94a3b8; padding-top: 6px; color: #64748b; }
  .footer { margin-top: 32px; font-size: 10px; color: #94a3b8; text-align: center; }
  @page { size: A4; margin: 12mm; }
  @media print { body { padding: 0; } }
`;

export function printHtml(title: string, body: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${e(title)}</title><style>${styles}</style></head><body>${body}</body></html>`;
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

const companyBlock = (s: CompanySettings) => `
  <div>
    <div class="brand">${e(s.name)}</div>
    <div class="muted">${ml(s.address)}</div>
    <div class="muted">${e(s.phone)} · ${e(s.email)}</div>
    <div class="muted">UEN ${e(s.uen)}${s.gstRegNo ? ` · GST Reg No. ${e(s.gstRegNo)}` : ""}</div>
  </div>`;

const customerBlock = (c: Customer | undefined, heading: string) => `
  <div class="box" style="min-width: 260px">
    <div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.06em">${e(heading)}</div>
    <div style="font-weight:600;margin-top:4px">${e(c?.name ?? "Unknown customer")}</div>
    ${c?.contactPerson ? `<div>Attn: ${e(c.contactPerson)}</div>` : ""}
    ${c?.billingAddress ? `<div class="muted">${ml(c.billingAddress)}</div>` : ""}
    ${c?.email ? `<div class="muted">${e(c.email)}</div>` : ""}
  </div>`;

const linesTable = (doc: Quotation | SalesOrder | Invoice) => {
  const t = documentTotals(doc.lines, doc.gstRate);
  const rows = doc.lines
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td>${e(l.description)}</td>
        <td class="num">${e(l.quantity)}</td>
        <td class="num">${formatSGD(l.unitPrice)}</td>
        <td class="num">${l.discountPct ? `${e(l.discountPct)}%` : "—"}</td>
        <td class="num">${formatSGD(lineNet(l))}</td>
      </tr>`,
    )
    .join("");
  return `
    <table class="lines">
      <thead><tr><th style="width:32px">#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Disc.</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="totals">
      ${t.discount ? `<tr><td class="muted">Gross</td><td class="num">${formatSGD(t.gross)}</td></tr><tr><td class="muted">Discount</td><td class="num">−${formatSGD(t.discount)}</td></tr>` : ""}
      <tr><td class="muted">Subtotal (excl. GST)</td><td class="num">${formatSGD(t.subtotal)}</td></tr>
      <tr><td class="muted">GST ${e(doc.gstRate)}%</td><td class="num">${formatSGD(t.gst)}</td></tr>
      <tr class="grand"><td>Total (SGD)</td><td class="num">${formatSGD(t.total)}</td></tr>
    </table>`;
};

const header = (s: CompanySettings, title: string, meta: [string, string][]) => `
  <div class="row">
    ${companyBlock(s)}
    <div class="doc-title">
      <h1>${e(title)}</h1>
      <table class="meta" style="margin-left:auto;margin-top:8px">
        ${meta.map(([k, v]) => `<tr><td>${e(k)}</td><td><strong>${e(v)}</strong></td></tr>`).join("")}
      </table>
    </div>
  </div>`;

const footer = (s: CompanySettings) =>
  `<div class="footer">${e(s.name)} · UEN ${e(s.uen)} · This is a computer-generated document.</div>`;

export function printQuotation(q: Quotation, customer: Customer | undefined, s: CompanySettings) {
  const body = `
    ${header(s, "QUOTATION", [
      ["Quotation No.", q.number],
      ["Date", formatDate(q.date)],
      ["Valid until", formatDate(q.validUntil)],
      ...(q.reference ? ([["Reference", q.reference]] as [string, string][]) : []),
    ])}
    <div style="margin-top:24px">${customerBlock(customer, "Quoted to")}</div>
    ${linesTable(q)}
    ${q.notes ? `<h3>Notes</h3><div>${ml(q.notes)}</div>` : ""}
    ${q.terms ? `<h3>Terms &amp; conditions</h3><div class="muted">${ml(q.terms)}</div>` : ""}
    <div class="sign"><div>For ${e(s.name)}</div><div>Accepted by (name, signature, company stamp &amp; date)</div></div>
    ${footer(s)}`;
  printHtml(q.number, body);
}

export function printSalesOrder(o: SalesOrder, customer: Customer | undefined, s: CompanySettings) {
  const body = `
    ${header(s, "SALES ORDER", [
      ["Order No.", o.number],
      ["Date", formatDate(o.date)],
      ["Delivery", formatDate(o.deliveryDate)],
      ...(o.reference ? ([["Reference", o.reference]] as [string, string][]) : []),
    ])}
    <div style="margin-top:24px">${customerBlock(customer, "Customer")}</div>
    ${linesTable(o)}
    ${o.notes ? `<h3>Notes</h3><div>${ml(o.notes)}</div>` : ""}
    <div class="sign"><div>Prepared by</div><div>Received in good order by</div></div>
    ${footer(s)}`;
  printHtml(o.number, body);
}

export function printInvoice(inv: Invoice, customer: Customer | undefined, s: CompanySettings) {
  const paid = amountPaid(inv);
  const body = `
    ${inv.status === "Void" ? `<div style="position:fixed;top:40%;left:0;right:0;text-align:center;font-size:96px;color:rgba(220,38,38,.15);transform:rotate(-20deg)">VOID</div>` : ""}
    ${header(s, s.gstRegNo ? "TAX INVOICE" : "INVOICE", [
      ["Invoice No.", inv.number],
      ["Date", formatDate(inv.date)],
      ["Due date", formatDate(inv.dueDate)],
      ...(inv.reference ? ([["Reference", inv.reference]] as [string, string][]) : []),
    ])}
    <div style="margin-top:24px">${customerBlock(customer, "Bill to")}</div>
    ${linesTable(inv)}
    ${
      paid > 0
        ? `<table class="totals"><tr><td class="muted">Paid to date</td><td class="num">−${formatSGD(paid)}</td></tr>
           <tr class="grand"><td>Balance due</td><td class="num">${formatSGD(balanceDue(inv))}</td></tr></table>`
        : ""
    }
    ${inv.notes ? `<h3>Notes</h3><div>${ml(inv.notes)}</div>` : ""}
    <h3>Payment</h3>
    <div class="box">${e(s.bankDetails)}<br/><span class="muted">Please quote ${e(inv.number)} with your payment.</span></div>
    ${footer(s)}`;
  printHtml(inv.number, body);
}

export function printServiceReport(job: ServiceJob, visits: AttendanceRecord[], s: CompanySettings) {
  const totalHours = visits.reduce((sum, v) => sum + attendanceHours(v), 0);
  const parts = job.partsUsed
    .map(
      (p) =>
        `<tr><td>${e(p.item)}</td><td class="num">${e(p.quantity)}</td><td class="num">${formatSGD(p.cost)}</td><td class="num">${formatSGD(p.quantity * p.cost)}</td></tr>`,
    )
    .join("");
  const visitRows = visits
    .map(
      (v) =>
        `<tr><td>${e(v.technician)}</td><td>${e(formatDateTime(v.checkIn))}</td><td>${v.checkOut ? e(formatDateTime(v.checkOut)) : "On site"}</td><td class="num">${formatHours(attendanceHours(v))}</td><td>${e(v.notes)}</td></tr>`,
    )
    .join("");
  const body = `
    ${header(s, "SERVICE REPORT", [
      ["Job No.", job.jobNumber],
      ["Scheduled", `${formatDate(job.dateScheduled)} ${job.timeScheduled}`],
      ["Status", job.status],
    ])}
    <div class="row" style="margin-top:24px">
      <div class="box" style="flex:1"><div class="muted">Customer</div><strong>${e(job.customer)}</strong><div>${e(job.site)}</div></div>
      <div class="box" style="flex:1"><div class="muted">Service</div><strong>${e(job.serviceType)}</strong><div>Technician: ${e(job.technician)} · Priority: ${e(job.priority)}</div></div>
    </div>
    <h3>Work description</h3><div>${ml(job.description)}</div>
    ${visitRows ? `<h3>Attendance (${formatHours(totalHours)})</h3><table class="lines"><thead><tr><th>Technician</th><th>Check-in</th><th>Check-out</th><th class="num">Duration</th><th>Notes</th></tr></thead><tbody>${visitRows}</tbody></table>` : ""}
    ${parts ? `<h3>Parts used</h3><table class="lines"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>${parts}</tbody></table><table class="totals"><tr class="grand"><td>Parts total</td><td class="num">${formatSGD(partsTotal(job))}</td></tr></table>` : ""}
    ${job.notes ? `<h3>Technician notes</h3><div>${ml(job.notes)}</div>` : ""}
    <div class="sign"><div>Technician: ${e(job.technician)}</div><div>Customer acknowledgement (name, signature &amp; date)</div></div>
    ${footer(s)}`;
  printHtml(`Service report ${job.jobNumber}`, body);
}

export function printInventoryReport(items: InventoryItem[], s: CompanySettings) {
  const total = items.reduce((sum, i) => sum + i.currentStock * i.unitCost, 0);
  const rows = items
    .map(
      (i) =>
        `<tr><td>${e(i.sku)}</td><td>${e(i.name)}<div class="muted">${e(i.brand)} ${e(i.model)}</div></td><td>${e(i.category)}</td><td>${e(i.location)}</td><td class="num">${e(i.currentStock)}</td><td class="num">${formatSGD(i.unitCost)}</td><td class="num">${formatSGD(i.currentStock * i.unitCost)}</td><td>${e(stockStatus(i))}</td></tr>`,
    )
    .join("");
  const body = `
    ${header(s, "INVENTORY REPORT", [["Generated", new Date().toLocaleString("en-SG")], ["Items", String(items.length)]])}
    <table class="lines"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Location</th><th class="num">Stock</th><th class="num">Unit cost</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals"><tr class="grand"><td>Total stock value (at cost)</td><td class="num">${formatSGD(total)}</td></tr></table>
    ${footer(s)}`;
  printHtml("Inventory report", body);
}
