#!/usr/bin/env bash
# =====================================================================
# Verified Kitchen — start everything for a development session
#
#   ./dev.sh            broker + edge service + website
#   ./dev.sh --no-web   broker + edge service only
#
# Press Ctrl+C once to stop everything it started.
# Logs from all three are shown here, each line prefixed with its name.
# =====================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WITH_WEB=1
[ "${1:-}" = "--no-web" ] && WITH_WEB=0

red() { printf '\033[31m%s\033[0m\n' "$*"; }
bold() { printf '\033[1m%s\033[0m\n' "$*"; }

# ---- Prerequisites ------------------------------------------------------
missing=0
command -v mosquitto_passwd >/dev/null || { red "Mosquitto is not installed: brew install mosquitto"; missing=1; }
command -v uv >/dev/null || { red "uv is not installed: brew install uv"; missing=1; }
command -v npm >/dev/null || { red "Node.js / npm is not installed"; missing=1; }
[ -f "$ROOT/infrastructure/mosquitto/passwd" ] || { red "No broker accounts yet: run infrastructure/mosquitto/setup.sh"; missing=1; }
[ -f "$ROOT/services/edge-service/.env" ] || { red "Missing services/edge-service/.env (copy .env.example)"; missing=1; }
if [ "$WITH_WEB" = 1 ] && [ ! -f "$ROOT/apps/web-dashboard/.env.local" ]; then
  red "Missing apps/web-dashboard/.env.local (copy .env.example)"; missing=1
fi
[ "$missing" = 0 ] || exit 1

# ---- Stop copies left running from an earlier session ---------------------
# Two edge services would share one MQTT session and keep disconnecting each other.
if pgrep -f "edge-service run" >/dev/null; then
  echo "Stopping an edge service that was already running…"
  pkill -INT -f "edge-service run"; sleep 3
fi
if pgrep -f "mosquitto -c mosquitto.conf" >/dev/null; then
  echo "Stopping a broker that was already running…"
  pkill -TERM -f "mosquitto -c mosquitto.conf"; sleep 1
fi
if [ "$WITH_WEB" = 1 ] && lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  red "Port 3000 is already in use (another 'npm run dev'?). Stop it first, or use ./dev.sh --no-web."
  exit 1
fi

# ---- Start --------------------------------------------------------------
pids=()
prefix() { # name colour
  while IFS= read -r line; do printf '\033[%sm%-6s\033[0m %s\n' "$2" "$1" "$line"; done
}

cleanup() {
  echo
  bold "Stopping…"
  for pid in "${pids[@]}"; do kill -INT "$pid" 2>/dev/null; done
  sleep 3
  for pid in "${pids[@]}"; do kill -TERM "$pid" 2>/dev/null; done
  # Children of `uv run` / `npm run` that ignored the signal:
  pkill -INT -f "edge-service run" 2>/dev/null
  pkill -TERM -f "mosquitto -c mosquitto.conf" 2>/dev/null
  bold "All stopped."
  exit 0
}
trap cleanup INT TERM

bold "Verified Kitchen — development session"

(cd "$ROOT/infrastructure/mosquitto" && mkdir -p data \
  && exec "$(brew --prefix mosquitto)/sbin/mosquitto" -c mosquitto.conf) 2>&1 | prefix mqtt 35 &
pids+=($!)
sleep 1

(cd "$ROOT/services/edge-service" && PYTHONUNBUFFERED=1 exec uv run edge-service run) 2>&1 | prefix edge 36 &
pids+=($!)

if [ "$WITH_WEB" = 1 ]; then
  (cd "$ROOT/apps/web-dashboard" && exec npm run dev) 2>&1 | prefix web 32 &
  pids+=($!)
  echo "Website: http://localhost:3000/dashboard"
fi
echo "Power on the ESP32 (USB or battery); its readings appear within ~30 s."
bold "Press Ctrl+C to stop everything."

wait
