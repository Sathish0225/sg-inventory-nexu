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
desktop app bundles the same web app; the phone app is a separate React Native (Expo) project. Both
call the API with a bearer token.

## Phone and desktop apps

| App | Built with | Where it lives |
| --- | --- | --- |
| Web | React + Vite | served by the API at your server address |
| **Phone (Android and iOS)** | **React Native + Expo** (SDK 57, Expo Router) | `mobile/` |
| Desktop (Windows, macOS and Linux) | Electron, wrapping the web app | `desktop/` |

All three talk to the same server. On first launch the apps ask for the **company server** address
(e.g. `inventrack.yourcompany.sg`), then an email and password, and stay signed in for 30 days.

### Phone app (`mobile/`)

It has native screens designed for use in the field:

| Tab | What it does |
| --- | --- |
| Home | Role-aware summary; an "on site" banner with one tap to check out; upcoming jobs, overdue invoices, reorder alerts |
| Jobs | My jobs or everyone's; job detail with **check in / check out (GPS)**, work notes, parts, visits, directions, mark completed, create invoice, print or share the service report as a PDF |
| Stock | Search, **barcode / QR scanning** (SKU or serial number), stock levels, stock in/out (for roles allowed to) |
| Sales | Quotations, sales orders and invoices: mark sent or rejected, convert, confirm, fulfil, issue, **record payments**, print or share the PDF |
| More | Attendance and timesheet hours, customers (tap to call or email), change password, sign out |

Creating new jobs, quotations and invoices with many lines is left to the web and desktop apps, where a
keyboard and a large screen make it quicker.

Details:

- **Shared code:** the phone app reuses the web app's types, GST maths, permissions and printable
  documents from `src/` (Babel alias `@/…`, watched by Metro), so totals and PDFs match everywhere.
- **Sign-in:** the token is stored in the iOS Keychain / Android Keystore (`expo-secure-store`). If
  the phone has no signal at launch, the app keeps you signed in and offers a retry.
- **Revoking access:** changing a password signs the user out on every device. So does an admin
  resetting their password, changing their role or disabling them.
- **Permissions:** location (attendance proof) and camera (barcode scanning) only, each with an
  explanation shown to the user; microphone, storage and overlay permissions are blocked.
- **HTTPS:** the server must use HTTPS; iOS and Android block plain-http connections by default.

Run it on your phone during development with **Expo Go**. Every native module the app uses is included in
Expo Go.

```sh
npm --prefix mobile install
npm run mobile:start    # scan the QR code with Expo Go (Android) or the Camera app (iPhone)
```

Builds:

- **Test APK for staff phones:** run the *Build apps* GitHub Action, or `npx eas-cli build -p android --profile preview`.
- **App Store / Google Play:** use EAS, which builds and signs in the cloud without needing a Mac:
  `npx eas-cli build -p ios --profile production` and `-p android --profile production`, then
  `npx eas-cli submit`. This needs a free Expo account, an Apple Developer account for iOS, and a
  Google Play developer account for Android. For staff-only distribution, use TestFlight / Apple Business
  Manager and a Google Play internal track or private app.
- **Native projects:** `android/` and `ios/` are generated (`npx expo prebuild`) and not committed;
  configure native behaviour in `mobile/app.json`.

### Desktop app (`desktop/`)

The desktop app is the web app packaged with Electron. It has native print and save dialogs, one window per
user, and external links open in your browser. The page is sandboxed with no Node.js access and a
strict content security policy, and the sign-in token is encrypted with the OS keychain (on Linux this
needs a GNOME or KDE keyring, otherwise an owner-only file is used).

```sh
npm --prefix desktop install
npm run desktop:start          # run it
npm run desktop:dist           # build installers for this OS (desktop/release/)
```

### Building everything

The **Build apps** GitHub Action (`.github/workflows/apps.yml`) runs from the Actions tab or when you push a tag
such as `v1.0.0`. It produces an Android APK, an iOS simulator build that checks the project compiles, and
Windows, macOS and Linux installers. Unsigned desktop installers show "unknown publisher" warnings; to sign
them, add a Windows code-signing certificate (`CSC_LINK`, `CSC_KEY_PASSWORD`) and an Apple Developer ID plus
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
| `npm run db:generate` | Regenerate the Prisma client after changing `server/prisma/schema.prisma` |
| `npm run mobile:start` | Start the phone app's Expo dev server (scan the QR code with Expo Go) |
| `npm run desktop:start` | Build the web app and open it in the desktop app |
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
  lib/platform.ts        web / desktop differences (storage, GPS, files)
  lib/documents.ts       printable documents as HTML (shared with the phone app)
  lib/print.ts           printable quotations, orders, invoices, service & inventory reports
  store/useStore.ts      client cache + API actions
  components/, pages/    UI
mobile/                  phone app: React Native + Expo (src/app = screens, src/lib, src/ui)
desktop/                 Electron app (main.cjs, preload.cjs, installer config)
server/                  API
  prisma/schema.prisma   database schema;  prisma/migrations/  SQL migrations
  prisma/seed.ts         users + demo data
  src/routes/            one file per resource
  src/services/          stock movements, document numbering, conversions
  test/                  integration tests (real database, concurrency cases)
```
