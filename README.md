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
- Consumers (no login) can read only two views: the latest score and a 7-day history.

## Repository layout

| Path | What it is | Status |
|---|---|---|
| `apps/web-dashboard` | Next.js 16 operator dashboard (TypeScript, Tailwind, Recharts) | All pages on live data except AI Monitoring (preview until the camera layer exists) |
| `services/edge-service` | Python 3.13 MQTT ingestion, scoring engine, violation rules, Supabase writer, simulator | Live with the real ESP32; camera input next |
| `infrastructure/supabase` | SQL migrations, seed, maintenance scripts, database test suite | 5 migrations, 28 database assertions |
| `iot/esp32` | ESP32 firmware (BME280 + DS18B20 + PCF8563 → MQTT) | Live (firmware 1.0.1) |
| `services/blockchain` | Hyperledger Fabric anchoring | Planned |
| `apps/mobile-app` | Flutter consumer app | Planned |
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

## Running continuously (edge computer)

The broker and the edge service run as macOS background services. They start at login and restart if they stop:

```bash
infrastructure/macos/install-services.sh     # install, or update after code changes
infrastructure/macos/uninstall-services.sh   # remove
tail -f ~/Library/Logs/VerifiedKitchen/edge-service.log
```

`edge-service run` processes **real sensor data only**. Simulated camera evidence is added only with an explicit `--ai simulate` flag, for demos. Set the Mac to not sleep while monitoring (System Settings → Battery/Energy → *Prevent automatic sleeping*), because a sleeping Mac stops receiving data.

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
