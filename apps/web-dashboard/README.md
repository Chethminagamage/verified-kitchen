# Verified Kitchen — Web Dashboard

Two sites in one Next.js 16 app (App Router, TypeScript, Tailwind CSS, Recharts, Supabase):

| Site | URL | Who |
|---|---|---|
| Kitchen console | `/login`, `/dashboard/...` | Kitchen operators and health inspectors, scoped to their own kitchen |
| Admin site | `/admin/login`, `/admin/...` | Platform administrators: onboard kitchens, register devices, manage staff accounts, read customer reports |

Each site has its own sign-in page and rejects the other's accounts. Customers use the mobile app and cannot sign in to either.

## Setup

```bash
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:3000
```

The database must already have the migrations in `infrastructure/supabase` applied (see the root README).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit tests (`tests/unit`) |
| `npm run create-admin` | Creates the first administrator (asks for email, name and password; needs `SUPABASE_SECRET_KEY`) |

## Admin site

Set two server-only variables in `.env.local` (never prefix them with `NEXT_PUBLIC_`):

- `SUPABASE_SECRET_KEY`: creates staff logins and their one-time links, and blocks disabled logins.
- `SITE_URL`: this website's public address, used in those links (defaults to `http://localhost:3000` in development).

Then run `npm run create-admin` once and sign in at `/admin/login`. Further administrators are invited from the admin site.

How it is secured:

- Every change goes through a database function (`migrations/20261119000000_platform_admin.sql`) that checks for an active administrator, validates the input and writes `admin_audit_log` in the same transaction. Admins have no extra direct table rights.
- Pages and Server Actions check the admin session as well (`getAdminSession`); admin sessions end after 4 hours.
- Staff are invited with a one-time link (no email is sent). The link opens `/account/setup`, which redeems it only when the person submits a password, so link previews in chat apps cannot use it up.
- A new kitchen is hidden from the app until the database's go-live checklist passes: listing, an operator, an environmental sensor, a camera and a menu.
- Kitchens are never deleted (their evidence must stay); they are hidden. Devices with recorded evidence cannot be removed.
- Disabling an account stops all its data access immediately and bans its login.

## Structure

Each feature is a module with MVC-style layers:

```text
src/modules/<feature>/
├── model/        types and pure rules (unit-tested, no I/O)
├── repository/   Supabase queries (RLS applies; runs as the signed-in user)
├── service/      maps rows to view models, enforces UI-level rules
├── controller/   entry points for pages and server actions
└── view/         React components
```

| Folder | Contents |
|---|---|
| `src/app` | Routes. `(dashboard)` is the kitchen console, `admin` the admin site, `(auth)` the sign-in and account set-up pages |
| `src/infrastructure/supabase` | Browser, server and proxy clients, typed with `src/shared/types/database.types.ts` |
| `src/shared` | Layout (sidebar, mobile navigation, header), feedback components (live refresh, empty and error states) and utilities |

After a schema change, regenerate the types:

```bash
npx supabase gen types typescript --project-id <ref> > src/shared/types/database.types.ts
```

## Conventions

- The dashboard never computes scores or applies safety thresholds. It displays what the edge service stored.
- Dates are shown in the kitchen's time zone (`kitchens.timezone`) and built from `Intl` parts, so server and client render the same HTML.
- Live pages use `LiveRefresh`, which subscribes to Supabase Realtime and refreshes the page at most once every 5 s.
