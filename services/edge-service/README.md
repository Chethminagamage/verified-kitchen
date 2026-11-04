# Verified Kitchen — Edge Service

Python service that turns evidence into hygiene scores. It is the only trusted
writer of evidence, scores, violations and audit records. It uses the Supabase
secret key, which bypasses Row Level Security, so keep that key on this machine only.

```text
ESP32 (MQTT) ─┐
              ├─► evidence ─► 3 pillar scores ─► weighted score ─► violations ─► Supabase
YOLO (camera)─┘                                                     (audit records are
Simulator ────┘   (same pipeline)                                    added by DB triggers)
```

The simulator produces the same evidence the real inputs will, so the dashboard
and the scoring can be built and evaluated before the hardware is ready.

## Setup

```bash
brew install uv            # once
cd services/edge-service
cp .env.example .env       # then paste your Supabase URL and secret key
uv sync
uv run edge-service check  # verifies the connection and seed data
```

## Commands

| Command | What it does |
|---|---|
| `uv run edge-service scenarios` | List the five evaluation scenarios |
| `uv run edge-service simulate --scenario ppe` | Run one scenario live, in real time (10 s ticks) |
| `uv run edge-service simulate --scenario baseline --loop` | Keep the dashboard live until Ctrl+C |
| `uv run edge-service backfill` | Write a realistic 7-day history for charts and reports |
| `... --dry-run` | Run without connecting or writing anything |

Scenarios: `baseline` (S1), `ppe` (S2), `food_prep` (S3), `fridge` (S4), `multiple` (S5).

## Scoring model (provisional, `v0-provisional`)

- **Indicator score**: the share of confident detections in the 60 s window that were
  compliant. It needs at least 3 confident detections; with fewer, the indicator counts
  as having no evidence.
- **Pillars**: personal and food prep are the mean of their indicators. Environmental is
  the mean of the temperature, humidity and fridge metric scores. Each metric scores 100
  inside its safe band and falls linearly to 0 at the tolerance beyond it.
- **Overall**: the weighted mean of the pillars that have evidence. Weights come from the
  active `scoring_configs` row and are re-normalised when a pillar has no evidence.
- **Violations**: a condition must persist (AI: 30 s, sensors: 120 s) before it is raised.
  No duplicate is raised while one is still open.

Every number above lives in `scoring_configs.thresholds` and can be overridden without
code changes. Each score row records the config version and a per-indicator breakdown
(`details`).

## Development

```bash
uv run pytest          # unit + scenario tests (no network)
uv run ruff check src tests
uv run mypy
```
