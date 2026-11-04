# Verified Kitchen — Web Dashboard

Operator console for Verified Kitchen, built with Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts and Supabase.

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
| `src/app` | Routes and the `(dashboard)` layout, which handles sign-in redirects and the "no kitchen assigned" screen |
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
