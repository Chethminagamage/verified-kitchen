#!/usr/bin/env bash
# Stops and removes the Verified Kitchen launchd agents (logs are kept).
set -euo pipefail
DOMAIN="gui/$(id -u)"
for label in com.verifiedkitchen.edge-service com.verifiedkitchen.mosquitto; do
  launchctl bootout "$DOMAIN/$label" 2>/dev/null && echo "stopped $label" || echo "$label was not running"
  rm -f "$HOME/Library/LaunchAgents/$label.plist"
done
