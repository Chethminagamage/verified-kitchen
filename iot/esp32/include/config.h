// Verified Kitchen — node configuration (no secrets here; see secrets.h).
#pragma once

#define FW_VERSION "1.0.0"
#define CONTRACT_VERSION 1  // docs/api/mqtt-contract.md

// Identity — must match devices.id / kitchens.code in the database.
#define DEVICE_ID "vk-env-01"
#define KITCHEN_CODE "kitchen-001"

// ---- Pins (from the hardware test sketch) ---------------------------------
// BME280 on SPI
#define PIN_BME_SCK 18
#define PIN_BME_MOSI 23  // module "SDA"
#define PIN_BME_MISO 19  // module "SDO"
#define PIN_BME_CS 27    // module "CSB"
// PCF8563 RTC on I2C (address 0x51)
#define PIN_RTC_SDA 21
#define PIN_RTC_SCL 22
// DS18B20 fridge probe (1-Wire, 4.7 kΩ pull-up to 3.3 V)
#define PIN_DS18B20 32
// Status LEDs (-1 = not fitted). GPIO 2 is the Dev Kit's on-board blue LED.
#define PIN_LED_STATUS 2   // blinks while connecting, solid when connected to the broker
#define PIN_LED_FAULT -1   // on while a sensor has failed or the clock is untrusted

// ---- Timing -------------------------------------------------------------------
#define SAMPLE_INTERVAL_MS 30000UL       // matches SENSOR_INTERVAL_S on the edge
#define STATUS_INTERVAL_MS 300000UL      // retained status every 5 min
#define SENSOR_RETRY_MS 60000UL          // re-initialise a failed sensor
#define BROKER_RESOLVE_RETRY_MS 15000UL  // mDNS lookup of the broker
#define BROKER_STALE_MS 120000UL         // re-resolve broker if disconnected this long
#define WATCHDOG_TIMEOUT_S 60            // reboot if the loop hangs

// ---- Offline buffer (LittleFS) -----------------------------------------------
#define BUFFER_CHUNK_LINES 120           // one file per hour of readings
#define BUFFER_MAX_CHUNKS 24             // keep at most ~24 h; oldest dropped first

// ---- Time -----------------------------------------------------------------------
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.google.com"
#define MIN_VALID_EPOCH 1735689600L      // 2025-01-01: anything earlier is not a real time
