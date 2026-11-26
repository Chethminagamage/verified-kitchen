#!/usr/bin/env bash
# Runs the local broker in the foreground (Ctrl+C to stop).
set -euo pipefail
cd "$(dirname "$0")"
[ -f passwd ] || { echo "Run ./setup.sh first to create broker accounts." >&2; exit 1; }
mkdir -p data
exec "$(brew --prefix mosquitto)/sbin/mosquitto" -c mosquitto.conf
