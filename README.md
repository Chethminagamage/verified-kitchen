# Verified Kitchen

**A Privacy-Preserving AIoT and Blockchain Framework for Real-Time Hygiene Rating in Cloud Kitchens**

Verified Kitchen monitors one food-preparation workstation and turns two kinds of evidence into a live, auditable hygiene score:

- **AI evidence.** A camera feeds YOLO, which runs locally on an edge computer. It checks hairnet, mask and gloves, plus surface cleanliness, spills and waste.
- **IoT evidence.** An ESP32 sends kitchen temperature, humidity and refrigerator temperature over MQTT.

Only detection metadata leaves the edge device. **No video or images are stored anywhere.**

[![CI](https://github.com/Chethminagamage/verified-kitchen/actions/workflows/ci.yml/badge.svg)](https://github.com/Chethminagamage/verified-kitchen/actions/workflows/ci.yml)

---

## Architecture

```text
 Camera ──RTSP──► Edge computer (MacBook Air M1)
                    OpenCV + YOLO ─┐
 ESP32 ──MQTT────► Mosquitto ──────┤
                                   ▼
                     services/edge-service  (Python)
                     evidence ─► 3 pillar scores ─► weighted score ─► violations
                                   │   (service-role key; the only trusted writer)
                                   ▼
                     Supabase  (PostgreSQL + Auth + Realtime)
                     · Row Level Security on every table
                     · violation workflow and audit hash chain enforced by triggers
                     · 7-day evidence retention with hourly roll-ups
                       │                       │                         │
                       ▼                       ▼                         ▼
          apps/web-dashboard        public views (anon)        Hyperledger Fabric
          Next.js operator console  → Flutter consumer app     anchors audit hashes
```

**Design rules**

- AI and IoT produce *evidence*; the edge service owns *scoring*. The dashboard only displays results and never applies its own thresholds.
- PostgreSQL holds operational data. The blockchain stores only audit-record hashes, never raw readings.
- Every violation and every status change is appended to a per-kitchen SHA-256 hash chain by a database trigger, so no writer can skip the audit.
- Consumers sign in to the app and can read only the marketplace views (published hygiene rating, 7-day history and menus) plus their own orders; all operational data stays private (Row Level Security).

## Repository layout

| Path | What it is | Status |
|---|---|---|
| `apps/web-dashboard` | Next.js 16 operator console and `/admin` site (TypeScript, Tailwind, Recharts) | All pages on live data: hygiene, environment, AI monitoring (PPE + food preparation), violations, audit, reports, orders, settings |
| `services/edge-service` | Python 3.13 MQTT ingestion, scoring engine, violation rules, public rating, Supabase writer, simulator | Live with the real ESP32 and the camera (`edge-service vision`: PPE and food-preparation YOLO models on CoreML) |
| `infrastructure/supabase` | SQL migrations, seed, demo data, maintenance scripts, database test suite | 12 migrations |
| `iot/esp32` | ESP32 firmware (BME280 + DS18B20 + PCF8563 → MQTT) | Live (firmware 1.1.0, up to three Wi-Fi networks) |
| `services/blockchain` | Hyperledger Fabric anchoring | Planned |
| `apps/mobile-app` | Flutter consumer app (Riverpod, go_router): browse and search kitchens and dishes, hygiene grades, cart, cash-on-delivery ordering, live tracking, reorder, feedback | Working (Android; iOS configured) |
| `docs/` | Architecture, database, API and testing notes | — |

## Getting started

**Prerequisites:** Node.js 24 or later, [uv](https://docs.astral.sh/uv/) (`brew install uv`), and a Supabase project (free plan).

### 1. Database (Supabase SQL Editor)

Run these in order, each one once:

1. `infrastructure/supabase/migrations/20261104000000_initial_schema.sql`
2. `infrastructure/supabase/migrations/20261104010000_violation_workflow_and_audit.sql`
3. `infrastructure/supabase/migrations/20261104020000_score_series.sql`
4. `infrastructure/supabase/migrations/20261104030000_evidence_retention.sql`
5. `infrastructure/supabase/migrations/20261105000000_sensor_series.sql`
6. `infrastructure/supabase/seed.sql`

Then create a user under **Authentication → Users** and give it admin access to the kitchen:

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'YOUR_EMAIL');
insert into public.user_kitchens (user_id, kitchen_id)
select u.id, k.id from auth.users u, public.kitchens k
 where u.email = 'YOUR_EMAIL' and k.code = 'kitchen-001';
```

### 2. Edge service

```bash
cd services/edge-service
cp .env.example .env          # SUPABASE_URL + SUPABASE_SECRET_KEY (sb_secret_…)
uv sync
uv run edge-service check     # verifies connection and seed data
uv run edge-service backfill  # optional: 7 days of realistic history
uv run edge-service simulate --scenario ppe
```

See [services/edge-service/README.md](services/edge-service/README.md) for the scoring model, the five evaluation scenarios and data volumes.

### 3. Web dashboard

```bash
cd apps/web-dashboard
cp .env.example .env.local    # NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                   # http://localhost:3000
```

## Development session

Start everything with one command when you begin working. **Ctrl+C stops it all**:

```bash
./dev.sh                     # MQTT broker + edge service + website (http://localhost:3000)
./dev.sh --vision            # ... plus the camera / PPE detection (webcam or RTSP camera)
./dev.sh --vision --preview  # ... and show the camera on screen to position it (nothing is saved)
./dev.sh --no-web            # broker + edge service only
```

In VS Code, use **Cmd+Shift+P → Tasks: Run Task → Verified Kitchen: start**. Then power on the ESP32; its readings appear within about 30 s. Logs from all three parts are shown in one terminal, each line labelled `mqtt`, `edge` or `web`.

`edge-service run` processes **real sensor data only**. Simulated camera evidence is added only with an explicit `--ai simulate` flag, for demos.

**Later (demo or deployment):** `infrastructure/macos/install-services.sh` installs the broker and edge service as macOS background services that run without a terminal and restart automatically. `uninstall-services.sh` removes them. This is not needed during development.

## Testing

| Suite | Command | Covers |
|---|---|---|
| Web unit tests | `cd apps/web-dashboard && npm test` | navigation, filters, workflow rules, role checks, status bands, time formatting |
| Edge service | `cd services/edge-service && uv run pytest` | scoring, violation persistence and de-duplication, all five scenarios, storage cadence |
| Database | `PGHOST=… ./infrastructure/supabase/tests/run.sh` (on an **empty** Postgres only) | RLS per role, workflow, audit chain and tamper detection, retention correctness |

GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all three, plus lint, strict type checks and a production build, on every push and pull request.

## Security

- `.env` and `.env.local` are git-ignored; only `.env.example` placeholders are committed.
- The browser uses only the publishable key. The secret key lives on the edge computer and never ships to a client.
- Row Level Security is enabled on every table:
  - Operators read their own kitchen's data and can only change a violation's status.
  - PHIs (public health inspectors) are read-only.
  - Consumers can read only the public views.
- Never commit camera or RTSP passwords, database passwords or blockchain keys.

## Design refinements from the original proposal

| Proposal | Now | Why |
|---|---|---|
| NestJS + Prisma backend | Python edge service + Supabase | Supabase already provides auth, RLS, REST and realtime. A single Python service handles YOLO, MQTT and scoring, which means fewer moving parts to build, test and explain. |
| `sensors` table | `devices` | One row per physical device (ESP32 node, camera) with its health status. |
| Separate `pillar_scores` table | Pillar columns on `hygiene_scores` | One row per scoring window keeps the three pillars and the overall score consistent. |
| — | `scoring_configs` | Versioned weights and thresholds, so every score traces back to the settings that produced it (RQ1). |
| — | Evidence retention | Keeps the free-tier database at about 50 MB without changing any chart. |
