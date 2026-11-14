# Verified Kitchen — Edge Service

Python service that turns evidence into hygiene scores. It is the only trusted
writer of evidence, scores, violations and audit records. It uses the Supabase
secret key, which bypasses Row Level Security, so keep that key on this machine only.

```text
ESP32 ──MQTT telemetry──┐
                        ├─► evidence ─► 3 pillar scores ─► weighted score ─► violations ─► Supabase
Camera process ─MQTT────┘                                                   (audit records are
(edge-service vision:                                                        added by DB triggers)
 RTSP/webcam → YOLO, frames in RAM only)
Simulator (same pipeline, for evaluation scenarios)
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
| `uv run edge-service simulate --scenario ppe` | Run one scenario live, in real time (stops by itself) |
| `uv run edge-service simulate --scenario baseline --loop` | Keep the dashboard live until Ctrl+C |
| `uv run edge-service backfill` | Write a realistic 7-day history for charts and reports |
| `... --dry-run` | Run without connecting or writing anything |

Scenarios: `baseline` (S1), `ppe` (S2), `food_prep` (S3), `fridge` (S4), `multiple` (S5).

## Vision (camera process)

`edge-service vision` is a **separate process** (YOLO can never slow down sensor ingestion) that follows the
standard industrial edge-AI pattern: **RTSP/webcam in → inference on the edge → aggregated events out over MQTT**.

```text
camera ─► newest frame only ─► crop worker region ─► YOLO (CoreML, Neural Engine) ─► 5-s window vote ─► MQTT
          (capture thread)      (VISION_ROI)          ~5 frames/s, ~7 ms/frame        one result per item
```

- **Privacy:** frames exist only in memory. Nothing writes images or video, no face recognition. Two tests enforce
  this (`test_vision_code_contains_no_way_to_store_images`, `test_running_the_pipeline_creates_no_files`).
- **Least privilege:** the camera process has its own broker account (`vk-cam-01`) that may publish only its own
  topics, and it never reads the Supabase key. The edge service remains the only database writer.
- **Evidence rules:** an item counts only when the model explicitly sees it worn or not worn; not seen = unknown,
  never a violation. A negative class in a frame wins (one bare hand is a breach); per 5-s window the majority of
  observing frames decides. See `src/edge_service/vision/ppe.py` and `docs/api/mqtt-contract.md`.
- **Traceability:** every result carries `model_version` = file name + SHA-256 prefix of the weights.

### Setup (once)

```bash
cd services/edge-service
uv sync --extra vision                                   # Ultralytics, OpenCV, coremltools (macOS)
mkdir -p models && cp ~/Downloads/model-test/ppe_yolo26n_best.mlpackage models/   # model is git-ignored
../../infrastructure/mosquitto/add-device.sh vk-cam-01   # camera broker account -> .env
```

Apply migration `20261114000000_ai_detection_dedupe.sql` in Supabase once (makes stored windows idempotent).

### Run

| Command | What it does |
|---|---|
| `./dev.sh --vision` (repo root) | Broker + edge service + camera + website together |
| `uv run edge-service vision --preview` | Show the camera on screen with the region and live results, to position the camera (nothing saved; Q closes the preview, Ctrl+C stops) |
| `uv run edge-service vision --roi 0.25,0,0.5,1` | Analyse only the worker region (fractions x,y,w,h); put it in `VISION_ROI` |
| `VISION_SOURCE=rtsp` + `VK_RTSP_URL=…` in `.env` | Use the IP camera instead of the webcam |
| `uv run edge-service vision --source clip.mp4` | Replay a recorded clip (for repeatable tests) |

On macOS the first webcam run asks for camera permission for the terminal / VS Code: click **Allow**.

## Scoring model (`v1-live`)

All rules live in the active `scoring_configs` row (`thresholds` JSON, written out in full by migration
`20261115000000_scoring_v1_live.sql`), so every stored score is traceable to the exact rules that produced
it and rules change without code changes. Engine: `src/edge_service/scoring.py` (pure functions).

| Step | Rule |
|---|---|
| Window | Live score at time T uses the evidence of the last **5 min** (`window_s`). |
| AI indicator | Share of confident camera windows in which the hygienic state was seen. Compliance needs confidence ≥ 0.5, a **breach ≥ 0.6** (a misdetection must not penalise a compliant kitchen). Fewer than 3 confident windows = no evidence (unknown, never 0 or 100). |
| Items | `surface` pools the clean- and dirty-surface classifications (one dirty board is not counted twice). |
| Sensors | Refrigerator by **time at temperature** (mean of per-reading scores: a door opening is a short dent, sustained warming the full penalty). Kitchen temperature and humidity by the **median** (ignores corrupted reads). Each reading scores 100 inside its safe band, falling linearly to 0 at the tolerance beyond it. |
| Pillar | Weighted mean of its items with evidence. Item weights by food-safety risk tier (rank-order-centroid): gloves 0.611 > hairnet = mask 0.1945; surface > spills = waste; refrigerator > kitchen temperature = humidity. |
| Overall | Weighted mean of the pillars with evidence (**equal** pillar weights until expert/AHP weights exist), re-normalised over what is available; missing pillars are recorded. |
| Caps | Non-compensatory: refrigerator ≥ 8 °C sustained 15 min → score ≤ 74 (not grade A). A gloves cap is defined but only applies once the PPE model is validated on the site's camera (`ai_validated`). |
| Grade | Sri Lanka PHI (H-800) bands: A ≥ 75, B ≥ 50, C ≥ 25, else D. |
| Violations | A condition must persist (AI 30 s, sensors 120 s) before it is raised; no duplicate while one is open. |

Each score row's `details` holds the full breakdown: grade, caps applied (with reason and the uncapped score),
per-item scores and weights, and **impacts** (points each item cost), which the dashboard shows as "Fix first".

## Data volume

The free Supabase plan has 500 MB. Writes are paced so the database stays small:

| What | Default cadence | Rows per day (24 h) |
|---|---|---|
| Sensor reading (ESP32) | every 30 s | 2,880 |
| AI detection, per indicator (7) | every 15 s | 40,320 |
| Hygiene score | stored every 60 s; scoring and violation checks still run on every message | 1,440 |

Retention is handled by migration `20261104030000`, which runs hourly through pg_cron:

- Raw readings, detections and scores older than **7 days** are deleted.
- Scores are first rolled up into `hygiene_scores_hourly`, so charts for older periods are unchanged.
- Evidence that a violation points to is kept.
- Violations and audit records are never deleted.

Steady state is roughly 50 MB, however long the service runs. Stop `--loop` runs with Ctrl+C when you are not watching the dashboard.

## Development

```bash
uv run pytest          # unit + scenario tests (no network)
uv run ruff check src tests
uv run mypy
```
