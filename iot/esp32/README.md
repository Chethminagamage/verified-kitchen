# Verified Kitchen — ESP32 environmental node (`vk-env-01`)

Firmware for the Verified Kitchen environmental node. Every 30 s it reads kitchen air (BME280) and the refrigerator (DS18B20), stamps the reading with UTC from the PCF8563 RTC (synced by NTP), and publishes it to the local Mosquitto broker. The message format is defined in [docs/api/mqtt-contract.md](../../docs/api/mqtt-contract.md).

## Hardware

| Part | Bus | ESP32 pins |
|---|---|---|
| BME280 (HW-611) | SPI | SCK 18, MOSI/SDA 23, MISO/SDO 19, CS/CSB 27 |
| PCF8563 RTC + CR1220 | I2C (0x51) | SDA 21, SCL 22 |
| DS18B20 waterproof probe | 1-Wire | DATA 32, with a 4.7 kΩ pull-up to 3.3 V |
| Status LED | — | GPIO 2 (on-board): blinking = connecting, solid = connected |

Pins and timing live in [`include/config.h`](include/config.h).

**Placement:** keep the BME280 **away from the LM2596 buck converter, the BMS and the charger** (outside the enclosure or behind a vent, on a short cable). Otherwise it measures the board's own heat, not the kitchen. Put the DS18B20 probe in the middle of a refrigerator shelf, not against the wall or near the door.

## What the firmware guarantees

- **No fake values.** DS18B20 errors (−127 °C disconnected, 85 °C power-on) and BME280 NaN/out-of-range readings are sent as `null` with the sensor marked `error`. A failed sensor is re-initialised every 60 s.
- **Correct time.** The RTC stores UTC and is corrected by NTP whenever Wi-Fi is up. If the RTC lost its time and NTP is unreachable, readings say `time_source: "none"` and are not buffered.
- **No data lost during outages.** While Wi-Fi or the broker is down, readings go to flash (LittleFS, up to ~24 h, oldest dropped first). They are re-sent oldest-first with their original timestamps. The database ignores duplicates.
- **Gaps are visible.** `seq` increases monotonically across reboots, so the edge service can count lost messages.
- **Self-recovery.** Wi-Fi and MQTT reconnect automatically. The broker is found by its mDNS name, so a new hotspot IP is fine. A 60 s watchdog reboots a hung loop.
- **Offline notice.** If the node disappears, the broker publishes its retained last will (`state: offline`) and the dashboard shows the device as offline.
- **No self-heating.** The BME280 runs in forced mode, sleeping between readings.

## First-time setup

1. **Broker accounts** (from the repo root). This creates the MQTT passwords and writes `include/secrets.h`:
   ```bash
   infrastructure/mosquitto/setup.sh
   ```
2. **Wi-Fi.** Edit `include/secrets.h` (git-ignored) and set `WIFI_SSID` and `WIFI_PASSWORD`.
   - The ESP32 only supports **2.4 GHz** Wi-Fi. On an iPhone hotspot, turn on **Maximize Compatibility**.
   - The ESP32 and the MacBook must be on the **same** network.
3. **Flash.** Connect the board by USB, then:
   ```bash
   cd iot/esp32
   pio run -t upload        # if it waits on "Connecting...", hold the BOOT button
   pio device monitor       # serial log, Ctrl+C to exit
   ```

## Running the system

```bash
infrastructure/mosquitto/run.sh                                   # terminal 1: MQTT broker
cd services/edge-service && uv run edge-service run               # terminal 2: edge service
```

`edge-service run` simulates the AI evidence until the camera service exists. Use `--ai none` to process sensors only.

**Testing without the board:** `uv run edge-service fake-device --count 5 --interval 5` publishes exactly like the firmware. Add `--buffered 10` to simulate an outage, or `--fault ds18b20` / `--fault sentinel` to inject faults.

## Serial log example

```text
=== Verified Kitchen node vk-env-01, firmware 1.0.0 (reset: poweron) ===
[sensor] PCF8563 RTC: OK
[sensor] BME280 (SPI): OK
[sensor] DS18B20: OK
[buffer] 0 reading(s) waiting
[time] system clock set from RTC: 1793810100
[mqtt] connecting to 172.20.10.9:1883
[time] NTP sync OK (1793810102); RTC updated
[read] seq=21 ambient=27.41 humidity=61.3 fridge=3.625 time=ntp mqtt=up buffer=0
```
