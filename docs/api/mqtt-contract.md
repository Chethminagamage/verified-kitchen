# MQTT contract — devices ⇄ edge service

Devices: the ESP32 environmental node (`vk-env-01`, telemetry) and the camera process (`vk-cam-01`, `edge-service vision`, detections).

Version **1**. The firmware (`iot/esp32`) and the edge service (`services/edge-service`) both implement this document. Change it here first.

## Broker

- Mosquitto runs on the edge computer (the MacBook) on the local network.
- Address `Derosnecs-MacBook.local` (mDNS, so it survives hotspot IP changes), port **1883**.
- Anonymous access is **disabled**. Each device has its own username and password, and an ACL lets it publish **only its own topics**. The edge service has its own read-only account.

## Topics

| Topic | Direction | QoS | Retained | Purpose |
|---|---|---|---|---|
| `vk/{kitchen}/{device}/telemetry` | device → edge | 1 | no | One sensor reading |
| `vk/{kitchen}/{device}/status` | device → edge | 1 | **yes** | Device health, and the last-will "offline" message |
| `vk/{kitchen}/{device}/detections` | camera → edge | 1 | no | PPE results for one 5-second window |

`{kitchen}` is `kitchens.code` (e.g. `kitchen-001`) and `{device}` is `devices.id` (e.g. `vk-env-01`). Both must match `[a-z0-9-]{1,32}`.

## `telemetry` payload

```json
{
  "v": 1,
  "device_id": "vk-env-01",
  "seq": 1842,
  "ts": "2026-11-04T08:35:00Z",
  "time_source": "rtc",
  "readings": {
    "ambient_temp_c": 27.41,
    "humidity_pct": 61.3,
    "pressure_hpa": 951.8,
    "fridge_temp_c": 3.625
  },
  "sensors": { "bme280": "ok", "ds18b20": "ok" },
  "rssi": -61,
  "buffered": false
}
```

| Field | Rules |
|---|---|
| `v` | Contract version. The edge service rejects versions it does not know. |
| `device_id` | Must equal `{device}` in the topic and be registered in `devices` for that kitchen. |
| `seq` | Monotonic counter, kept across reboots. Gaps show lost messages. |
| `ts` | UTC measurement time, ISO-8601 with `Z`. Taken from the PCF8563 RTC, which is synced by NTP. |
| `time_source` | `ntp` or `rtc` means `ts` is trusted. `none` means the RTC lost its time (backup power failed) and NTP is unavailable; the edge service then uses the time it received the message. |
| `readings.*` | Number, or `null` when that sensor failed. **Never** a sentinel such as −127 or 85. Ranges are the same as the database checks. |
| `sensors.*` | `ok` or `error` |
| `rssi` | Wi-Fi signal in dBm |
| `buffered` | `true` when the reading is re-sent from the offline buffer |

**Delivery:** QoS 1 means at least once. Duplicates are harmless because the database ignores a repeated `(device_id, ts)`. Readings taken offline are stored on the device (up to 24 h) and re-sent oldest first after reconnecting.

## `status` payload (retained)

```json
{ "v": 1, "device_id": "vk-env-01", "state": "online", "fw": "1.0.0",
  "uptime_s": 86400, "rssi": -61, "buffer": 0, "time_source": "ntp",
  "sensors": { "bme280": "ok", "ds18b20": "ok" }, "reset_reason": "poweron" }
```

The last will, which the broker publishes if the device drops off, is `{"v":1,"device_id":"vk-env-01","state":"offline"}`.

## Cadence

The node sends one telemetry message every **30 s** (matches `SENSOR_INTERVAL_S`), and `status` on connect and every 5 min.

## `detections` payload (camera process)

The camera process (`services/edge-service`, `edge-service vision`) analyses about 5 frames per second
on the edge computer and publishes **one message per 5-second window**. No image data is ever sent.

```json
{
  "v": 1,
  "device_id": "vk-cam-01",
  "seq": 128,
  "window_start": "2026-11-14T14:16:16.715Z",
  "window_end": "2026-11-14T14:16:21.715Z",
  "model_version": "ppe_yolo26n_best@ada23a1ecd47",
  "frames_analysed": 24,
  "inference_ms": 7.86,
  "indicators": [
    { "indicator": "mask", "compliant": false, "confidence": 0.479,
      "frames_observed": 17, "frames_compliant": 0, "frames_noncompliant": 17,
      "classes": { "no_mask": 17 } }
  ]
}
```

| Field | Rules |
|---|---|
| `seq` | Window counter; restarts at 0 when the process starts (its first `status` has a small `uptime_s`). |
| `window_start` / `window_end` | UTC. The window is longer than 0 s and at most 60 s. `window_end` becomes `ai_detections.detected_at`. |
| `model_version` | Model file name + first 12 hex digits of the SHA-256 of the weights, so every stored result is traceable to the exact model. |
| `frames_analysed` | Frames analysed in the window. |
| `indicators[]` | Only indicators **observed** in at least `VISION_MIN_FRAMES` frames. Not seen = no entry (unknown), never a violation. At most one entry per indicator. |
| `compliant` | Majority vote over the observing frames (a tie counts as compliant). In a frame, an explicit negative class (`no_glove`, `no_mask`, `incorrect_mask`, `no_hairnet`) wins over a positive one. |
| `confidence` | Mean model confidence of the frames supporting the decision (0–1). |
| `frames_*` | `frames_compliant + frames_noncompliant = frames_observed ≤ frames_analysed`. |

A window with no indicators (worker out of view) is still published: it keeps the camera "online" without creating evidence.
The edge service stores one `ai_detections` row per indicator; a QoS 1 redelivery is ignored by the unique
`(device_id, indicator, detected_at)` key.

### Camera `status` (retained)

```json
{ "v": 1, "device_id": "vk-cam-01", "state": "online", "camera": "ok", "source": "webcam 0",
  "model_version": "ppe_yolo26n_best@ada23a1ecd47", "fps": 4.9, "inference_ms": 7.2,
  "uptime_s": 66, "roi": "full frame", "privacy": "frames in memory only; nothing stored" }
```

`camera` is `ok` (frames arriving), `error` (no frames for 5 s) or `stopped` (clean shutdown, with `state: offline`).
`source` never contains the RTSP URL (it holds the camera password). Sent on start, on every camera state change and
every 30 s. Last will: `{"v":1,"device_id":"vk-cam-01","state":"offline"}`.

### Accounts

Each device has its own broker account and may publish only `vk/+/<its id>/…`. The edge service additionally checks that
the environmental node sends only `telemetry` and the camera only `detections`.
