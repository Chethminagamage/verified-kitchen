# MQTT contract — ESP32 environmental node ⇄ edge service

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
