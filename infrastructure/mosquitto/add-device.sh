#!/usr/bin/env bash
# Adds (or rotates the password of) ONE broker account without touching the others,
# so the ESP32 does not need re-flashing.
#
#   infrastructure/mosquitto/add-device.sh vk-cam-01
#
# For the camera process the password is written to services/edge-service/.env
# as VISION_MQTT_PASSWORD (git-ignored). A running broker reloads its accounts.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
DEVICE_ID="${1:-}"
EDGE_ENV="$ROOT/services/edge-service/.env"

[[ "$DEVICE_ID" =~ ^[a-z0-9-]{1,32}$ ]] || { echo "usage: $0 <device-id>   e.g. vk-cam-01" >&2; exit 1; }
[ "$DEVICE_ID" != "edge-service" ] || { echo "Use setup.sh to rotate the edge-service account." >&2; exit 1; }
command -v mosquitto_passwd >/dev/null || { echo "Install Mosquitto first: brew install mosquitto" >&2; exit 1; }
[ -f "$HERE/passwd" ] || { echo "No broker accounts yet: run setup.sh first." >&2; exit 1; }

umask 077
PW="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
mosquitto_passwd -b "$HERE/passwd" "$DEVICE_ID" "$PW"   # adds or replaces only this user

case "$DEVICE_ID" in
  vk-cam-*)
    touch "$EDGE_ENV"
    tmp="$(mktemp)"
    grep -vE '^VISION_MQTT_PASSWORD=' "$EDGE_ENV" > "$tmp" || true
    { cat "$tmp"; echo "VISION_MQTT_PASSWORD=$PW"; } > "$EDGE_ENV"
    rm -f "$tmp"
    echo "Camera account ${DEVICE_ID} ready; password -> services/edge-service/.env (VISION_MQTT_PASSWORD)"
    ;;
  *)
    echo "Account ${DEVICE_ID} ready. Its password (put it in the device's config): ${PW}"
    ;;
esac

# Reload a running broker so the new account works immediately (SIGHUP re-reads passwd and acl).
if pkill -HUP -f "mosquitto -c mosquitto.conf" 2>/dev/null; then
  echo "Running broker reloaded."
fi
