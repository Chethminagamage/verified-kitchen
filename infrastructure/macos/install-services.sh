#!/usr/bin/env bash
# Installs the MQTT broker and the edge service as macOS launchd agents so they
# start at login and restart automatically if they stop.
#
#   infrastructure/macos/install-services.sh      # install / update + start
#   infrastructure/macos/uninstall-services.sh    # stop + remove
#
# Logs: ~/Library/Logs/VerifiedKitchen/{mosquitto,edge-service}.log
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AGENTS="$HOME/Library/LaunchAgents"
LOGS="$HOME/Library/Logs/VerifiedKitchen"
DOMAIN="gui/$(id -u)"
MOSQUITTO="$(brew --prefix mosquitto)/sbin/mosquitto"
UV="$(command -v uv)"

[ -x "$MOSQUITTO" ] || { echo "Mosquitto not found: brew install mosquitto" >&2; exit 1; }
[ -x "$UV" ] || { echo "uv not found: brew install uv" >&2; exit 1; }
[ -f "$ROOT/infrastructure/mosquitto/passwd" ] || { echo "Run infrastructure/mosquitto/setup.sh first" >&2; exit 1; }
[ -f "$ROOT/services/edge-service/.env" ] || { echo "Create services/edge-service/.env first" >&2; exit 1; }

mkdir -p "$AGENTS" "$LOGS" "$ROOT/infrastructure/mosquitto/data"

write_agent() { # label program-args-xml working-dir log-name
  cat > "$AGENTS/$1.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$1</string>
  <key>ProgramArguments</key><array>$2</array>
  <key>WorkingDirectory</key><string>$3</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>ProcessType</key><string>Background</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>PYTHONUNBUFFERED</key><string>1</string>
  </dict>
  <key>StandardOutPath</key><string>$LOGS/$4.log</string>
  <key>StandardErrorPath</key><string>$LOGS/$4.log</string>
</dict>
</plist>
EOF
}

write_agent com.verifiedkitchen.mosquitto \
  "<string>$MOSQUITTO</string><string>-c</string><string>mosquitto.conf</string>" \
  "$ROOT/infrastructure/mosquitto" mosquitto

# Real sensors only: the edge service default never adds simulated AI evidence.
write_agent com.verifiedkitchen.edge-service \
  "<string>$UV</string><string>run</string><string>--frozen</string><string>edge-service</string><string>run</string>" \
  "$ROOT/services/edge-service" edge-service

# Stop copies started by hand (e.g. from a terminal): two edge services would
# share one MQTT session and keep disconnecting each other.
pkill -INT -f "edge-service run" 2>/dev/null && sleep 3 || true
pkill -TERM -f "mosquitto -c mosquitto.conf" 2>/dev/null && sleep 1 || true

for label in com.verifiedkitchen.mosquitto com.verifiedkitchen.edge-service; do
  launchctl bootout "$DOMAIN/$label" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$AGENTS/$label.plist"
  echo "started $label"
done
echo "Logs: $LOGS"
