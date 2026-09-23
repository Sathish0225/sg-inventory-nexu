import{c as y,q as i,s as w,X as v,V as b,A as f,o as m,J as S,aa as T,b as k,ab as N,ac as R,d as D,a9 as I}from"./index-D3T-yUNX.js";import{e,a as l}from"./html-B0HC-t4b.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=y("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]),P=`
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
`;function u(t,a){const d=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(t)}</title><style>${P}</style></head><body>${a}</body></html>`;if(N){R(`${t.replace(/[^\w.-]+/g,"-")}.html`,d,"text/html").catch(()=>{});return}const s=document.createElement("iframe");s.setAttribute("aria-hidden","true"),Object.assign(s.style,{position:"fixed",right:"0",bottom:"0",width:"0",height:"0",border:"0"}),document.body.appendChild(s);const o=s.contentDocument;o.open(),o.write(d),o.close();const n=s.contentWindow,c=()=>setTimeout(()=>s.remove(),500);n.addEventListener("afterprint",c),setTimeout(()=>{n.focus(),n.print(),setTimeout(c,6e4)},50)}const A=t=>`
  <div>
    <div class="brand">${e(t.name)}</div>
    <div class="muted">${l(t.address)}</div>
    <div class="muted">${e(t.phone)} · ${e(t.email)}</div>
    <div class="muted">UEN ${e(t.uen)}${t.gstRegNo?` · GST Reg No. ${e(t.gstRegNo)}`:""}</div>
  </div>`,$=(t,a)=>`
  <div class="box" style="min-width: 260px">
    <div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.06em">${e(a)}</div>
    <div style="font-weight:600;margin-top:4px">${e((t==null?void 0:t.name)??"Unknown customer")}</div>
    ${t!=null&&t.contactPerson?`<div>Attn: ${e(t.contactPerson)}</div>`:""}
    ${t!=null&&t.billingAddress?`<div class="muted">${l(t.billingAddress)}</div>`:""}
    ${t!=null&&t.email?`<div class="muted">${e(t.email)}</div>`:""}
  </div>`,g=t=>{const a=D(t.lines,t.gstRate);return`
    <table class="lines">
      <thead><tr><th style="width:32px">#</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Disc.</th><th class="num">Amount</th></tr></thead>
      <tbody>${t.lines.map((s,o)=>`<tr>
        <td>${o+1}</td>
        <td>${e(s.description)}</td>
        <td class="num">${e(s.quantity)}</td>
        <td class="num">${i(s.unitPrice)}</td>
        <td class="num">${s.discountPct?`${e(s.discountPct)}%`:"—"}</td>
        <td class="num">${i(I(s))}</td>
      </tr>`).join("")}</tbody>
    </table>
    <table class="totals">
      ${a.discount?`<tr><td class="muted">Gross</td><td class="num">${i(a.gross)}</td></tr><tr><td class="muted">Discount</td><td class="num">−${i(a.discount)}</td></tr>`:""}
      <tr><td class="muted">Subtotal (excl. GST)</td><td class="num">${i(a.subtotal)}</td></tr>
      <tr><td class="muted">GST ${e(t.gstRate)}%</td><td class="num">${i(a.gst)}</td></tr>
      <tr class="grand"><td>Total (SGD)</td><td class="num">${i(a.total)}</td></tr>
    </table>`},p=(t,a,d)=>`
  <div class="row">
    ${A(t)}
    <div class="doc-title">
      <h1>${e(a)}</h1>
      <table class="meta" style="margin-left:auto;margin-top:8px">
        ${d.map(([s,o])=>`<tr><td>${e(s)}</td><td><strong>${e(o)}</strong></td></tr>`).join("")}
      </table>
    </div>
  </div>`,h=t=>`<div class="footer">${e(t.name)} · UEN ${e(t.uen)} · This is a computer-generated document.</div>`;function z(t,a,d){const s=`
    ${p(d,"QUOTATION",[["Quotation No.",t.number],["Date",m(t.date)],["Valid until",m(t.validUntil)],...t.reference?[["Reference",t.reference]]:[]])}
    <div style="margin-top:24px">${$(a,"Quoted to")}</div>
    ${g(t)}
    ${t.notes?`<h3>Notes</h3><div>${l(t.notes)}</div>`:""}
    ${t.terms?`<h3>Terms &amp; conditions</h3><div class="muted">${l(t.terms)}</div>`:""}
    <div class="sign"><div>For ${e(d.name)}</div><div>Accepted by (name, signature, company stamp &amp; date)</div></div>
    ${h(d)}`;u(t.number,s)}function U(t,a,d){const s=`
    ${p(d,"SALES ORDER",[["Order No.",t.number],["Date",m(t.date)],["Delivery",m(t.deliveryDate)],...t.reference?[["Reference",t.reference]]:[]])}
    <div style="margin-top:24px">${$(a,"Customer")}</div>
    ${g(t)}
    ${t.notes?`<h3>Notes</h3><div>${l(t.notes)}</div>`:""}
    <div class="sign"><div>Prepared by</div><div>Received in good order by</div></div>
    ${h(d)}`;u(t.number,s)}function V(t,a,d){const s=T(t),o=`
    ${t.status==="Void"?'<div style="position:fixed;top:40%;left:0;right:0;text-align:center;font-size:96px;color:rgba(220,38,38,.15);transform:rotate(-20deg)">VOID</div>':""}
    ${p(d,d.gstRegNo?"TAX INVOICE":"INVOICE",[["Invoice No.",t.number],["Date",m(t.date)],["Due date",m(t.dueDate)],...t.reference?[["Reference",t.reference]]:[]])}
    <div style="margin-top:24px">${$(a,"Bill to")}</div>
    ${g(t)}
    ${s>0?`<table class="totals"><tr><td class="muted">Paid to date</td><td class="num">−${i(s)}</td></tr>
           <tr class="grand"><td>Balance due</td><td class="num">${i(k(t))}</td></tr></table>`:""}
    ${t.notes?`<h3>Notes</h3><div>${l(t.notes)}</div>`:""}
    <h3>Payment</h3>
    <div class="box">${e(d.bankDetails)}<br/><span class="muted">Please quote ${e(t.number)} with your payment.</span></div>
    ${h(d)}`;u(t.number,o)}function G(t,a,d){const s=a.reduce((r,x)=>r+v(x),0),o=t.partsUsed.map(r=>`<tr><td>${e(r.item)}</td><td class="num">${e(r.quantity)}</td><td class="num">${i(r.cost)}</td><td class="num">${i(r.quantity*r.cost)}</td></tr>`).join(""),n=a.map(r=>`<tr><td>${e(r.technician)}</td><td>${e(f(r.checkIn))}</td><td>${r.checkOut?e(f(r.checkOut)):"On site"}</td><td class="num">${b(v(r))}</td><td>${e(r.notes)}</td></tr>`).join(""),c=`
    ${p(d,"SERVICE REPORT",[["Job No.",t.jobNumber],["Scheduled",`${m(t.dateScheduled)} ${t.timeScheduled}`],["Status",t.status]])}
    <div class="row" style="margin-top:24px">
      <div class="box" style="flex:1"><div class="muted">Customer</div><strong>${e(t.customer)}</strong><div>${e(t.site)}</div></div>
      <div class="box" style="flex:1"><div class="muted">Service</div><strong>${e(t.serviceType)}</strong><div>Technician: ${e(t.technician)} · Priority: ${e(t.priority)}</div></div>
    </div>
    <h3>Work description</h3><div>${l(t.description)}</div>
    ${n?`<h3>Attendance (${b(s)})</h3><table class="lines"><thead><tr><th>Technician</th><th>Check-in</th><th>Check-out</th><th class="num">Duration</th><th>Notes</th></tr></thead><tbody>${n}</tbody></table>`:""}
    ${o?`<h3>Parts used</h3><table class="lines"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>${o}</tbody></table><table class="totals"><tr class="grand"><td>Parts total</td><td class="num">${i(S(t))}</td></tr></table>`:""}
    ${t.notes?`<h3>Technician notes</h3><div>${l(t.notes)}</div>`:""}
    <div class="sign"><div>Technician: ${e(t.technician)}</div><div>Customer acknowledgement (name, signature &amp; date)</div></div>
    ${h(d)}`;u(`Service report ${t.jobNumber}`,c)}function H(t,a){const d=t.reduce((n,c)=>n+c.currentStock*c.unitCost,0),s=t.map(n=>`<tr><td>${e(n.sku)}</td><td>${e(n.name)}<div class="muted">${e(n.brand)} ${e(n.model)}</div></td><td>${e(n.category)}</td><td>${e(n.location)}</td><td class="num">${e(n.currentStock)}</td><td class="num">${i(n.unitCost)}</td><td class="num">${i(n.currentStock*n.unitCost)}</td><td>${e(w(n))}</td></tr>`).join(""),o=`
    ${p(a,"INVENTORY REPORT",[["Generated",new Date().toLocaleString("en-SG")],["Items",String(t.length)]])}
    <table class="lines"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Location</th><th class="num">Stock</th><th class="num">Unit cost</th><th class="num">Value</th><th>Status</th></tr></thead><tbody>${s}</tbody></table>
    <table class="totals"><tr class="grand"><td>Total stock value (at cost)</td><td class="num">${i(d)}</td></tr></table>
    ${h(a)}`;u("Inventory report",o)}export{E as P,G as a,z as b,U as c,V as d,H as p};
