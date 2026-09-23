# InvenTrack SG

Inventory, field service and sales management for Singapore service businesses: stock control,
service jobs with technician attendance, quotations, sales orders and GST tax invoices. It's a
multi-user system with a PostgreSQL database and role-based sign-in.

## Modules

| Module | What it does |
| --- | --- |
| **Dashboard** | Live KPIs, revenue by month, receivables ageing, upcoming jobs, overdue invoices, reorder list (operations-only view for technicians) |
| **Inventory** | Items with SKU, cost and selling price; stock in/out with a movement history; reorder alerts; printable report |
| **Service Jobs** | Schedule jobs, record parts used (from inventory), mark complete (deducts parts from stock), print service reports, bill the job |
| **Attendance** | Technicians check in/out of jobs (optional GPS), live "on site now" board, timesheets with CSV export |
| **Customers** | Shared customer master with billed / outstanding totals |
| **Quotations** | Line items from inventory or free text, discounts, GST; Draft → Sent → Accepted/Rejected; convert to sales order or invoice |
| **Sales Orders** | Confirm, fulfil (deducts stock, all-or-nothing) and invoice |
| **Invoices** | Draft → Issued → Paid/Overdue/Void; record partial payments (PayNow, bank transfer, …); printable tax invoice |
| **Users** | Add staff, assign roles, reset passwords, disable accounts |
| **Settings** | Company details, GST rate, payment terms, document number prefixes |

### Roles

| Role | Can |
| --- | --- |
| **Admin** | Everything, including users and company settings |
| **Manager** | All operations, sales and invoicing; not users or settings |
| **Accounts** | Customers, quotations, sales orders, invoices and payments; read-only stock, jobs and attendance |
| **Technician** | See jobs and stock; update and check in/out of **their own** jobs only |

The API enforces every rule; the web app just hides what a role can't use.

### Document flow

```
Quotation ──► Sales Order ──► Invoice ──► Payments
    └───────────────────────► Invoice
Service Job (parts + attended hours × labour rate) ──► Invoice
```

Stock moves only through recorded movements: manual stock in/out, sales order fulfilment, and parts on
completed service jobs.

### Data integrity

- All business rules run on the server inside database transactions.
- Stock can't go below zero, even when two people fulfil orders at the same moment. Deductions are
  conditional updates, backed by a `CHECK` constraint.
- Document numbers (`QT-2026-0001` …) are allocated atomically, per type, restarting each year.
- Each source document can have only one live (non-void) invoice, enforced by a unique index.
- Payments on an invoice are serialised, so it can't be overpaid.
- Issued invoices can't be deleted, only voided, so the audit trail is kept.

## Architecture

```
┌────────────┐  /api (JSON, httpOnly session cookie)  ┌──────────────┐     ┌────────────┐
│  React app │ ─────────────────────────────────────► │ Fastify API  │ ──► │ PostgreSQL │
│  (Vite)    │                                        │ + Prisma     │     │            │
└────────────┘                                        └──────────────┘     └────────────┘
```

- **Web** (`src/`): React 18, TypeScript, Tailwind + shadcn/ui, React Router, Zustand as a client
  cache of server data.
- **API** (`server/`): Fastify 5, Prisma 6, zod validation, bcrypt passwords, JWT session in an
  httpOnly cookie, rate-limited login.
- **Shared** between both: domain types (`src/types`), money/GST maths (`src/lib/calc.ts`) and role
  permissions (`src/lib/permissions.ts`).

In production the API also serves the built web app, so there is one process and one port. The
mobile and desktop apps bundle the same web app and call the API cross-origin with a bearer token.

## Mobile and desktop apps

The same React app ships in three forms, all talking to your company server:

| App | Built with | Where it lives |
| --- | --- | --- |
| Web | Vite | served by the API at your server address |
| Android and iOS | [Capacitor](https://capacitorjs.com) | `android/`, `ios/`, `capacitor.config.ts` |
| Windows, macOS and Linux | [Electron](https://www.electronjs.org) | `desktop/` |

On first launch the apps ask for the **company server** address (e.g. `inventrack.yourcompany.sg`),
then an email and password. They stay signed in for 30 days.

- **Sign-in on devices.** Apps use a bearer token instead of the browser cookie. On desktop the token is
  encrypted with the OS keychain (on Linux this needs a GNOME or KDE keyring, otherwise an owner-only
  file is used); on phones it's kept in app-private storage.
- **Revoking access.** Changing a password signs the user out on every device. So does an admin
  resetting their password, changing their role or disabling them.
- **HTTPS required.** Apps only connect to `https://` servers (plus `localhost` for testing).
- **Allowed origins.** The server accepts cross-origin calls only from the app origins in `APP_ORIGINS`.
- **Phones:**
  - check-in uses native GPS, with the system permission prompt;
  - printing opens the share sheet (print, save to Files, email or WhatsApp the document);
  - the Android back button closes dialogs and navigates back;
  - data refreshes when the app returns to the foreground.
- **Desktop:** native print dialog and save dialogs, a single window per user, and external links open
  in the browser. The page is sandboxed with no Node.js access and a strict content security policy.

### Building the apps

The **Build apps** GitHub Action (`.github/workflows/apps.yml`) builds everything. Run it from the Actions tab
or push a tag such as `v1.0.0`. It produces an Android debug APK; Windows, macOS and Linux installers; and an
iOS simulator build that checks the project compiles.

Locally:

```sh
# Desktop (installers land in desktop/release/)
npm --prefix desktop install
npm run desktop:start          # run it
npm run desktop:dist           # build installers for this OS

# Mobile: needs Android Studio (Android) or Xcode on a Mac (iOS)
npm run mobile:android         # build the web app, sync, open Android Studio
npm run mobile:ios             # build the web app, sync, open Xcode
```

App icons and splash screens are generated from `assets/`. After changing them, run
`npx @capacitor/assets generate`. The desktop icon is `desktop/build/icon.png`.

### Publishing to the stores

These steps need your own developer accounts and signing keys, so they aren't automated here:

- **Google Play:** in Android Studio, *Build → Generate Signed Bundle*. Create an upload key once
  and keep it safe. Upload the `.aab` in the Play Console; for staff-only use, publish to an internal
  testing track or a managed Google Play private app.
- **Apple App Store / TestFlight:** needs an Apple Developer account (and a Mac). In Xcode set your Team
  under *Signing & Capabilities*, then *Product → Archive → Distribute*. For staff-only distribution, use
  TestFlight or Apple Business Manager (Custom Apps).
- **Desktop:** unsigned installers work but show "unknown publisher" warnings. To sign, add a Windows
  code-signing certificate (`CSC_LINK`, `CSC_KEY_PASSWORD`) and, on macOS, an Apple Developer ID plus
  notarisation credentials as secrets in the workflow.

## Local development

Requirements: Node 22 and PostgreSQL 14 or newer.

```sh
# 1. Install
npm install
npm --prefix server install

# 2. Configure the API
cp server/.env.example server/.env        # set DATABASE_URL and JWT_SECRET

# 3. Create tables and seed users + demo data
npm --prefix server run db:deploy
SEED_ADMIN_PASSWORD='choose-a-password' npm run db:seed

# 4. Run (two terminals)
npm run dev:server     # API on http://localhost:3001
npm run dev            # web on http://localhost:8080 (proxies /api to the API)
```

With demo data the seed creates one user per role (`admin@`, `manager@`, `accounts@`, and a technician per
name, e.g. `sarah.tan@inventrack.local`), all with `SEED_ADMIN_PASSWORD`. If that isn't set, a password is
generated and printed. The seed is safe to re-run: it never overwrites existing users or data.

To change the schema, edit `server/prisma/schema.prisma` and run `npm --prefix server run db:migrate`.

| Script | Purpose |
| --- | --- |
| `npm run dev` / `npm run dev:server` | Web / API dev servers |
| `npm test` | Web unit tests (money and GST maths) |
| `npm run test:server` | API integration tests against `inventrack_test` (a real Postgres database) |
| `npm run typecheck`, `npm run lint` | Static checks |
| `npm run build` | Production build of the web app to `dist/` |

API tests need an empty database whose name ends in `_test` (default
`postgresql://postgres@127.0.0.1:5432/inventrack_test`, override with `DATABASE_URL_TEST`). The
suite applies migrations and truncates tables between tests, and refuses to run against any other database.

## Deployment (Docker)

```sh
cp .env.docker.example .env      # set POSTGRES_PASSWORD, JWT_SECRET, SEED_ADMIN_* …
docker compose up -d --build
docker compose exec app npm run db:seed    # first run only: creates the admin account
```

The app listens on port 3001 and applies database migrations on every start.

- **HTTPS:** put it behind HTTPS, e.g. Caddy or nginx, and set `TRUST_PROXY=true`. The session cookie is
  `Secure`, so browsers won't keep it over plain http. For an office-only install reached as
  `http://<server-ip>:3001`, set `COOKIE_SECURE=false` instead.
- **Time zone:** dates such as due dates, "today" and numbering years follow `Asia/Singapore`.

### Backups

All data is in PostgreSQL. Back it up daily and keep copies off the server:

```sh
docker compose exec -T db pg_dump -U inventrack -Fc inventrack > inventrack-$(date +%F).dump
# restore into an empty database:
docker compose exec -T db pg_restore -U inventrack -d inventrack --clean < inventrack-YYYY-MM-DD.dump
```

## Project layout

```
src/                     web app
  types/                 domain model (shared with the API)
  lib/calc.ts            money, GST, dates, statuses (shared, unit-tested)
  lib/permissions.ts     roles → permissions (shared)
  lib/api.ts             fetch wrapper
  lib/platform.ts        web / desktop / mobile differences (storage, GPS, files, printing)
  lib/print.ts           printable quotations, orders, invoices, service & inventory reports
  store/useStore.ts      client cache + API actions
  components/, pages/    UI
android/, ios/           Capacitor native projects (mobile apps)
desktop/                 Electron app (main.cjs, preload.cjs, installer config)
assets/                  source images for app icons and splash screens
server/                  API
  prisma/schema.prisma   database schema;  prisma/migrations/  SQL migrations
  prisma/seed.ts         users + demo data
  src/routes/            one file per resource
  src/services/          stock movements, document numbering, conversions
  test/                  integration tests (real database, concurrency cases)
```
