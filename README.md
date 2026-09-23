# InvenTrack SG

Inventory, field service and sales management for Singapore service businesses: stock control,
service jobs with technician attendance, quotations, sales orders and GST tax invoices.

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Live KPIs, revenue by month, receivables ageing, upcoming jobs, overdue invoices, reorder list |
| **Inventory** | Items with SKU, cost and selling price; stock in/out with a movement history; reorder alerts; printable report |
| **Service Jobs** | Schedule jobs, record parts used (from inventory), mark complete (deducts parts from stock), print service reports, bill the job |
| **Attendance** | Technicians check in/out of jobs (optional GPS), live "on site now" board, timesheets with CSV export |
| **Customers** | Shared customer master with billed / outstanding totals |
| **Quotations** | Line items from inventory or free text, discounts, GST; Draft → Sent → Accepted/Rejected; convert to sales order or invoice |
| **Sales Orders** | Confirm, fulfil (deducts stock, all-or-nothing) and invoice |
| **Invoices** | Draft → Issued → Paid/Overdue/Void; record partial payments (PayNow, bank transfer, …); printable tax invoice |
| **Settings** | Company details, GST rate, payment terms, document number prefixes, technicians; backup / restore |

### Document flow

```
Quotation ──► Sales Order ──► Invoice ──► Payments
    └───────────────────────► Invoice
Service Job (parts + attended hours × labour rate) ──► Invoice
```

Stock moves only through recorded movements: manual stock in/out, sales order fulfilment and parts on
completed service jobs.

### Singapore specifics

- Amounts in SGD, GST (default 9%) calculated once on the discounted subtotal and captured per document.
- Invoices print as **TAX INVOICE** with the GST registration number when one is configured.
- Issued invoices can't be deleted, only voided, so the audit trail is kept.

## Tech stack

React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui, React Router (lazy-loaded routes),
Zustand (state + persistence), Recharts, Vitest.

Data is stored in the browser's `localStorage` (key `inventrack-sg`). Use **Settings → Data → Download
backup** to keep a copy or move data between browsers. All business rules live in
`src/store/useStore.ts`, so swapping in a backend (e.g. Supabase or a REST API) means replacing that
one module.

## Getting started

```sh
npm install
npm run dev        # http://localhost:8080
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Unit tests (money/GST maths and store workflows) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Project layout

```
src/
  types/            domain model
  lib/calc.ts       money, GST, dates, statuses (pure, unit-tested)
  lib/print.ts      printable quotations, orders, invoices, service & inventory reports
  store/            zustand store (business rules) + demo seed data
  components/
    layout/         sidebar shell, theme toggle
    common/         shared UI (stat cards, badges, dialogs…)
    sales/          document editor, line items, customer picker
    forms/          inventory and service job forms
  pages/            one file per module
```
