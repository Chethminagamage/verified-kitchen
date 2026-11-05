// =====================================================================
// Verified Kitchen — ESP32 environmental node firmware
//
// Every 30 s: read BME280 (kitchen air) + DS18B20 (refrigerator), stamp
// the reading with UTC time from the PCF8563 RTC (kept in sync by NTP),
// and publish it to the local MQTT broker (QoS 1). While Wi-Fi or the
// broker is unavailable, readings are kept in flash (up to ~24 h) and
// re-sent oldest-first after reconnecting.
//
// Message format: docs/api/mqtt-contract.md (v1).
// =====================================================================
#include <Arduino.h>
#include <ArduinoJson.h>
#include <DallasTemperature.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <OneWire.h>
#include <Preferences.h>
#include <RTClib.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <esp_sntp.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <mqtt_client.h>
#include <sys/time.h>
#include <time.h>

#include "config.h"
#include "secrets.h"

// ---------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------
static const char TOPIC_TELEMETRY[] = "vk/" KITCHEN_CODE "/" DEVICE_ID "/telemetry";
static const char TOPIC_STATUS[] = "vk/" KITCHEN_CODE "/" DEVICE_ID "/status";
static const char LAST_WILL[] = "{\"v\":1,\"device_id\":\"" DEVICE_ID "\",\"state\":\"offline\"}";

// ---------------------------------------------------------------------
// Hardware objects and health flags
// ---------------------------------------------------------------------
static Adafruit_BME280 bme(PIN_BME_CS, &SPI);
static RTC_PCF8563 rtc;
static OneWire oneWire(PIN_DS18B20);
static DallasTemperature ds18b20(&oneWire);
static Preferences prefs;

static bool bmeOk = false;
static bool rtcOk = false;
static bool dsOk = false;
static bool fsOk = false;
static uint32_t lastSensorRetry = 0;

// ---------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------
enum class TimeSource { None, Rtc, Ntp };
static TimeSource timeSource = TimeSource::None;
static volatile bool ntpJustSynced = false;

static const char *timeSourceName() {
  switch (timeSource) {
    case TimeSource::Ntp: return "ntp";
    case TimeSource::Rtc: return "rtc";
    default: return "none";
  }
}

static void onNtpSync(struct timeval *) { ntpJustSynced = true; }

// The RTC is trusted only after NTP has set it at least once (flag in NVS).
// An RTC set by other means (e.g. a test sketch's compile time) is not UTC.
static bool rtcVerified = false;

static void loadTimeFromRtc() {
  if (!rtcOk) return;
  if (rtc.lostPower()) {
    // Backup power failed: the RTC time is meaningless until NTP corrects it.
    prefs.putBool("rtc_ntp", false);
    Serial.println("[time] RTC lost power; waiting for NTP");
    return;
  }
  rtcVerified = prefs.getBool("rtc_ntp", false);
  if (!rtcVerified) {
    Serial.println("[time] RTC not yet verified by NTP; not trusting it");
    return;
  }
  const DateTime t = rtc.now();
  if ((long)t.unixtime() < MIN_VALID_EPOCH) return;
  const timeval tv = {(time_t)t.unixtime(), 0};
  settimeofday(&tv, nullptr);
  timeSource = TimeSource::Rtc;
  Serial.printf("[time] system clock set from RTC: %lu\n", (unsigned long)t.unixtime());
}

static void handleNtpSync() {
  if (!ntpJustSynced) return;
  ntpJustSynced = false;
  const time_t now = time(nullptr);
  if (now < MIN_VALID_EPOCH) return;
  timeSource = TimeSource::Ntp;
  if (rtcOk) {
    rtc.adjust(DateTime((uint32_t)now));  // RTC stores UTC; also clears the "lost power" flag
    rtc.start();
    if (!rtcVerified) prefs.putBool("rtc_ntp", true);
    rtcVerified = true;
  }
  Serial.printf("[time] NTP sync OK (%ld); RTC updated\n", (long)now);
}

static bool formatUtc(time_t t, char *out, size_t len) {
  struct tm tm;
  if (!gmtime_r(&t, &tm)) return false;
  return strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", &tm) > 0;
}

// ---------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------
static void initBme() {
  SPI.begin(PIN_BME_SCK, PIN_BME_MISO, PIN_BME_MOSI, PIN_BME_CS);
  bmeOk = bme.begin();
  if (bmeOk) {
    // Forced mode, 1x oversampling, no filter: Bosch's "weather monitoring"
    // profile. The sensor sleeps between readings, so it does not self-heat.
    bme.setSampling(Adafruit_BME280::MODE_FORCED, Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1, Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::FILTER_OFF);
  }
  Serial.printf("[sensor] BME280 (SPI): %s\n", bmeOk ? "OK" : "NOT FOUND");
}

static void initDs18b20() {
  ds18b20.begin();
  dsOk = ds18b20.getDeviceCount() > 0;
  if (dsOk) {
    ds18b20.setResolution(12);  // 0.0625 °C steps, ~750 ms conversion
    ds18b20.setWaitForConversion(true);
  }
  Serial.printf("[sensor] DS18B20: %s\n", dsOk ? "OK" : "NOT FOUND");
}

static void initRtc() {
  rtcOk = rtc.begin(&Wire);
  if (rtcOk) rtc.start();
  Serial.printf("[sensor] PCF8563 RTC: %s\n", rtcOk ? "OK" : "NOT FOUND");
}

struct Reading {
  float ambient = NAN, humidity = NAN, pressure = NAN, fridge = NAN;
  bool bme = false, ds = false;
};

static bool inRange(float v, float lo, float hi) { return !isnan(v) && v >= lo && v <= hi; }

static Reading readSensors() {
  Reading r;
  // A corrupted SPI read (noise or a loose jumper) can return NaN or an impossible
  // humidity such as 0 %. Retry once before reporting the sensor as failed.
  for (int attempt = 0; attempt < 2 && bmeOk && !r.bme; attempt++) {
    if (attempt > 0) delay(50);
    if (!bme.takeForcedMeasurement()) continue;
    r.ambient = bme.readTemperature();
    r.humidity = bme.readHumidity();
    r.pressure = bme.readPressure() / 100.0f;
    if (!inRange(r.ambient, -40, 85)) r.ambient = NAN;
    if (!inRange(r.humidity, 5, 100)) r.humidity = NAN;  // < 5 % is impossible indoors
    if (!inRange(r.pressure, 300, 1100)) r.pressure = NAN;
    r.bme = !isnan(r.ambient) && !isnan(r.humidity);
  }
  if (!r.bme) {
    // One bad field means the whole measurement is suspect.
    r.ambient = r.humidity = r.pressure = NAN;
  }
  if (!r.bme) bmeOk = false;  // re-initialised on the retry timer

  if (dsOk) {
    for (int attempt = 0; attempt < 2 && !r.ds; attempt++) {
      ds18b20.requestTemperatures();
      const float t = ds18b20.getTempCByIndex(0);
      // -127 = disconnected, 85.0 = power-on value before a real conversion.
      if (t != DEVICE_DISCONNECTED_C && t != 85.0f && inRange(t, -55, 125)) {
        r.fridge = t;
        r.ds = true;
      }
    }
  }
  if (!r.ds) dsOk = false;
  return r;
}

static void retryFailedSensors() {
  if (bmeOk && dsOk) return;
  if (millis() - lastSensorRetry < SENSOR_RETRY_MS) return;
  lastSensorRetry = millis();
  if (!bmeOk) initBme();
  if (!dsOk) initDs18b20();
}

// ---------------------------------------------------------------------
// Message counter (monotonic across reboots without wearing out flash)
// ---------------------------------------------------------------------
static const uint32_t SEQ_PERSIST_EVERY = 20;
static uint32_t seq = 0;

static void initSeq() {
  prefs.begin("vk", false);
  // Skip ahead past anything that may have been sent since the last save.
  seq = prefs.getUInt("seq", 0) + SEQ_PERSIST_EVERY;
  prefs.putUInt("seq", seq);
}

static uint32_t nextSeq() {
  seq++;
  if (seq % SEQ_PERSIST_EVERY == 0) prefs.putUInt("seq", seq);
  return seq;
}

// ---------------------------------------------------------------------
// Offline buffer: /buf/<n>.jsonl files of BUFFER_CHUNK_LINES lines each
// ---------------------------------------------------------------------
static uint32_t bufHead = 0;      // oldest chunk
static uint32_t bufTail = 0;      // chunk being written
static uint32_t tailLines = 0;    // lines in the tail chunk
static uint32_t bufferedCount = 0;

static String chunkPath(uint32_t n) { return "/buf/" + String(n) + ".jsonl"; }

static uint32_t countLines(const String &path) {
  File f = LittleFS.open(path, "r");
  uint32_t n = 0;
  while (f && f.available()) {
    if (f.read() == '\n') n++;
  }
  if (f) f.close();
  return n;
}

static void initBuffer() {
  fsOk = LittleFS.begin(true);
  if (!fsOk) {
    Serial.println("[buffer] LittleFS unavailable; offline buffering disabled");
    return;
  }
  if (!LittleFS.exists("/buf")) LittleFS.mkdir("/buf");
  bool any = false;
  File dir = LittleFS.open("/buf");
  for (File f = dir.openNextFile(); f; f = dir.openNextFile()) {
    const uint32_t n = String(f.name()).toInt();
    if (!any || n < bufHead) bufHead = n;
    if (!any || n > bufTail) bufTail = n;
    any = true;
  }
  if (!any) {
    bufHead = bufTail = 0;
  }
  if (any && !prefs.getBool("rtc_ntp", false)) {
    // Readings buffered before the clock was ever verified carry untrusted times.
    for (uint32_t n = bufHead; n <= bufTail; n++) LittleFS.remove(chunkPath(n));
    Serial.println("[buffer] discarded readings timed by an unverified clock");
    any = false;
    bufHead = bufTail = 0;
  }
  bufferedCount = 0;
  for (uint32_t n = bufHead; any && n <= bufTail; n++) bufferedCount += countLines(chunkPath(n));
  tailLines = any ? countLines(chunkPath(bufTail)) : 0;
  Serial.printf("[buffer] %lu reading(s) waiting\n", (unsigned long)bufferedCount);
}

static void bufferAppend(const String &json) {
  if (!fsOk) return;
  if (tailLines >= BUFFER_CHUNK_LINES) {
    bufTail++;
    tailLines = 0;
  }
  File f = LittleFS.open(chunkPath(bufTail), "a");
  if (!f) return;
  f.print(json);
  f.print('\n');
  f.close();
  tailLines++;
  bufferedCount++;
  // Keep at most BUFFER_MAX_CHUNKS: drop the oldest hour when full.
  while (bufTail - bufHead + 1 > BUFFER_MAX_CHUNKS) {
    bufferedCount -= min(bufferedCount, countLines(chunkPath(bufHead)));
    LittleFS.remove(chunkPath(bufHead));
    bufHead++;
    Serial.println("[buffer] full: dropped the oldest hour");
  }
}

// ---------------------------------------------------------------------
// Wi-Fi diagnostics
// ---------------------------------------------------------------------
static volatile bool scanWanted = false;
static uint32_t lastScan = 0;
static uint8_t lastReason = 0;
static uint32_t lastReasonLog = 0;

static const char *wifiReason(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_NO_AP_FOUND: return "network not found (name wrong, 5 GHz only, or out of range)";
    case WIFI_REASON_AUTH_FAIL:
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT:
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "wrong password";
    case WIFI_REASON_AUTH_EXPIRE:
    case WIFI_REASON_ASSOC_FAIL: return "access point refused the connection";
    case WIFI_REASON_BEACON_TIMEOUT: return "signal lost";
    default: return "disconnected";
  }
}

static void onWifiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    lastReason = 0;
    Serial.printf("[wifi] connected, IP %s, RSSI %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    const uint8_t reason = info.wifi_sta_disconnected.reason;
    // Reconnect attempts repeat every few seconds: log only changes, or every 30 s.
    if (reason != lastReason || millis() - lastReasonLog > 30000UL) {
      Serial.printf("[wifi] not connected: %s (reason %u)\n", wifiReason(reason), reason);
      lastReason = reason;
      lastReasonLog = millis();
    }
    if (reason == WIFI_REASON_NO_AP_FOUND) scanWanted = true;
  }
}

// When the network is not found, list what the ESP32 can see (non-ASCII bytes
// shown as \xNN, e.g. an iPhone's curly apostrophe is \xE2\x80\x99).
static void scanIfWanted() {
  if (!scanWanted || (lastScan != 0 && millis() - lastScan < 60000UL)) return;
  scanWanted = false;
  lastScan = millis();
  // A scan cannot run while the station keeps retrying: pause reconnects.
  WiFi.setAutoReconnect(false);
  WiFi.disconnect();
  delay(200);
  const int n = WiFi.scanNetworks();
  Serial.printf("[wifi] looking for \"%s\"; %d network(s) visible (2.4 GHz only):\n", WIFI_SSID, n);
  for (int i = 0; i < n; i++) {
    String shown;
    for (const char c : WiFi.SSID(i)) {
      const uint8_t b = (uint8_t)c;
      if (b >= 0x20 && b < 0x7f) {
        shown += c;
      } else {
        char hex[5];
        snprintf(hex, sizeof hex, "\\x%02X", b);
        shown += hex;
      }
    }
    Serial.printf("[wifi]   \"%s\" (%d dBm)\n", shown.c_str(), WiFi.RSSI(i));
  }
  WiFi.scanDelete();
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

// ---------------------------------------------------------------------
// MQTT (ESP-IDF client: QoS 1, last will, automatic reconnect)
// ---------------------------------------------------------------------
static esp_mqtt_client_handle_t mqtt = nullptr;
static volatile bool mqttConnected = false;
static volatile bool statusDue = false;
static String brokerIp;
static uint32_t lastResolve = 0;
static uint32_t disconnectedSince = 0;
static char brokerHost[64];

static void onMqttEvent(void *, esp_event_base_t, int32_t eventId, void *) {
  switch ((esp_mqtt_event_id_t)eventId) {
    case MQTT_EVENT_CONNECTED:
      mqttConnected = true;
      statusDue = true;
      break;
    case MQTT_EVENT_DISCONNECTED:
      mqttConnected = false;
      break;
    default:
      break;
  }
}

static String resolveBroker() {
  String host = MQTT_HOST;
  if (!host.endsWith(".local")) return host;  // already an IP or DNS name
  const String name = host.substring(0, host.length() - 6);
  const IPAddress ip = MDNS.queryHost(name.c_str(), 2000);
  if (ip == IPAddress(0, 0, 0, 0)) return "";
  return ip.toString();
}

static void stopMqtt() {
  if (!mqtt) return;
  esp_mqtt_client_stop(mqtt);
  esp_mqtt_client_destroy(mqtt);
  mqtt = nullptr;
  mqttConnected = false;
}

static void startMqtt(const String &ip) {
  stopMqtt();
  ip.toCharArray(brokerHost, sizeof(brokerHost));
  esp_mqtt_client_config_t cfg = {};
  cfg.host = brokerHost;
  cfg.port = MQTT_PORT;
  cfg.client_id = DEVICE_ID;
  cfg.username = MQTT_USERNAME;
  cfg.password = MQTT_PASSWORD;
  cfg.keepalive = 30;
  cfg.lwt_topic = TOPIC_STATUS;
  cfg.lwt_msg = LAST_WILL;
  cfg.lwt_qos = 1;
  cfg.lwt_retain = 1;
  cfg.network_timeout_ms = 10000;
  cfg.reconnect_timeout_ms = 5000;
  mqtt = esp_mqtt_client_init(&cfg);
  esp_mqtt_client_register_event(mqtt, (esp_mqtt_event_id_t)ESP_EVENT_ANY_ID, onMqttEvent, nullptr);
  esp_mqtt_client_start(mqtt);
  brokerIp = ip;
  disconnectedSince = millis();
  Serial.printf("[mqtt] connecting to %s:%d\n", brokerHost, MQTT_PORT);
}

static void maintainMqtt() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqttConnected) {
    disconnectedSince = millis();
    return;
  }
  // (Re)resolve the broker on first start, or after a long outage (the
  // hotspot may have given the edge computer a new IP address).
  const bool stale = mqtt && millis() - disconnectedSince > BROKER_STALE_MS;
  if ((mqtt && !stale) || millis() - lastResolve < BROKER_RESOLVE_RETRY_MS) return;
  lastResolve = millis();
  const String ip = resolveBroker();
  if (ip.isEmpty()) {
    Serial.printf("[mqtt] cannot resolve %s yet\n", MQTT_HOST);
    return;
  }
  if (!mqtt || ip != brokerIp || stale) startMqtt(ip);
}

static bool publish(const char *topic, const String &payload, bool retain) {
  if (!mqtt || !mqttConnected) return false;
  return esp_mqtt_client_publish(mqtt, topic, payload.c_str(), payload.length(), 1, retain ? 1 : 0) >= 0;
}

// ---------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------
static void setReading(JsonObject obj, const char *key, float v, int decimals) {
  if (isnan(v)) {
    obj[key] = nullptr;
  } else {
    const float scale = powf(10.0f, (float)decimals);
    obj[key] = roundf(v * scale) / scale;
  }
}

static String telemetryJson(const Reading &r, uint32_t s, time_t now, bool buffered) {
  JsonDocument doc;
  doc["v"] = CONTRACT_VERSION;
  doc["device_id"] = DEVICE_ID;
  doc["seq"] = s;
  char ts[24];
  if (timeSource != TimeSource::None && formatUtc(now, ts, sizeof ts)) doc["ts"] = ts;
  doc["time_source"] = timeSourceName();
  JsonObject readings = doc["readings"].to<JsonObject>();
  setReading(readings, "ambient_temp_c", r.ambient, 2);
  setReading(readings, "humidity_pct", r.humidity, 1);
  setReading(readings, "pressure_hpa", r.pressure, 1);
  setReading(readings, "fridge_temp_c", r.fridge, 3);
  JsonObject sensors = doc["sensors"].to<JsonObject>();
  sensors["bme280"] = r.bme ? "ok" : "error";
  sensors["ds18b20"] = r.ds ? "ok" : "error";
  if (WiFi.status() == WL_CONNECTED) {
    doc["rssi"] = WiFi.RSSI();
  } else {
    doc["rssi"] = nullptr;  // no Wi-Fi when measured (0 dBm would read as a perfect signal)
  }
  doc["buffered"] = buffered;
  String out;
  serializeJson(doc, out);
  return out;
}

static const char *resetReason() {
  switch (esp_reset_reason()) {
    case ESP_RST_POWERON: return "poweron";
    case ESP_RST_SW: return "software";
    case ESP_RST_PANIC: return "panic";
    case ESP_RST_INT_WDT:
    case ESP_RST_TASK_WDT:
    case ESP_RST_WDT: return "watchdog";
    case ESP_RST_BROWNOUT: return "brownout";
    case ESP_RST_DEEPSLEEP: return "deepsleep";
    default: return "other";
  }
}

static void publishStatus() {
  JsonDocument doc;
  doc["v"] = CONTRACT_VERSION;
  doc["device_id"] = DEVICE_ID;
  doc["state"] = "online";
  doc["fw"] = FW_VERSION;
  doc["uptime_s"] = (uint32_t)(millis() / 1000);
  doc["rssi"] = WiFi.RSSI();
  doc["buffer"] = bufferedCount;
  doc["time_source"] = timeSourceName();
  JsonObject sensors = doc["sensors"].to<JsonObject>();
  sensors["bme280"] = bmeOk ? "ok" : "error";
  sensors["ds18b20"] = dsOk ? "ok" : "error";
  doc["reset_reason"] = resetReason();
  String out;
  serializeJson(doc, out);
  publish(TOPIC_STATUS, out, true);
}

// Re-sends one buffered chunk per call, oldest first.
static void drainBuffer() {
  if (!fsOk || !mqttConnected || bufferedCount == 0) return;
  const String path = chunkPath(bufHead);
  File f = LittleFS.open(path, "r");
  if (!f) {
    if (bufHead < bufTail) bufHead++;
    return;
  }
  uint32_t sent = 0;
  bool ok = true;
  while (f.available()) {
    const String line = f.readStringUntil('\n');
    if (line.isEmpty()) continue;
    if (!publish(TOPIC_TELEMETRY, line, false)) {
      ok = false;
      break;
    }
    sent++;
    esp_task_wdt_reset();
    delay(20);  // pace the outbox
  }
  f.close();
  if (!ok) return;  // connection dropped: retry the whole chunk later (duplicates are ignored)
  LittleFS.remove(path);
  bufferedCount -= min(bufferedCount, sent);
  if (bufHead == bufTail) {
    tailLines = 0;  // buffer empty: keep writing to the same (now empty) chunk number
  } else {
    bufHead++;
  }
  Serial.printf("[buffer] re-sent %lu reading(s), %lu waiting\n", (unsigned long)sent,
                (unsigned long)bufferedCount);
}

// ---------------------------------------------------------------------
// LEDs
// ---------------------------------------------------------------------
static void setLed(int pin, bool on) {
  if (pin >= 0) digitalWrite(pin, on ? HIGH : LOW);
}

static void updateLeds() {
  const bool blink = (millis() / 500) % 2 == 0;
  setLed(PIN_LED_STATUS, mqttConnected ? true : blink);
  setLed(PIN_LED_FAULT, !bmeOk || !dsOk || timeSource == TimeSource::None);
}

// ---------------------------------------------------------------------
// Setup / loop
// ---------------------------------------------------------------------
static uint32_t lastSample = 0;
static uint32_t lastStatus = 0;
static bool firstSample = true;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("\n=== Verified Kitchen node %s, firmware %s (reset: %s) ===\n", DEVICE_ID, FW_VERSION,
                resetReason());

  if (PIN_LED_STATUS >= 0) pinMode(PIN_LED_STATUS, OUTPUT);
  if (PIN_LED_FAULT >= 0) pinMode(PIN_LED_FAULT, OUTPUT);

  // Reboot automatically if the main loop ever hangs.
  esp_task_wdt_init(WATCHDOG_TIMEOUT_S, true);
  esp_task_wdt_add(nullptr);

  Wire.begin(PIN_RTC_SDA, PIN_RTC_SCL);
  Wire.setClock(100000);
  initRtc();
  initBme();
  initDs18b20();
  initSeq();
  initBuffer();
  loadTimeFromRtc();

  WiFi.onEvent(onWifiEvent);
  Serial.printf("[wifi] connecting to \"%s\"\n", WIFI_SSID);
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_ID);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  MDNS.begin(DEVICE_ID);

  sntp_set_time_sync_notification_cb(onNtpSync);
  configTime(0, 0, NTP_SERVER_1, NTP_SERVER_2);  // UTC; re-syncs automatically
}

void loop() {
  esp_task_wdt_reset();
  handleNtpSync();
  retryFailedSensors();
  scanIfWanted();
  maintainMqtt();

  if (firstSample || millis() - lastSample >= SAMPLE_INTERVAL_MS) {
    firstSample = false;
    lastSample = millis();
    const Reading r = readSensors();
    const uint32_t s = nextSeq();
    const time_t now = time(nullptr);
    if (!publish(TOPIC_TELEMETRY, telemetryJson(r, s, now, false), false)) {
      // A reading without a trusted time cannot be placed later, so only buffer timed ones.
      if (timeSource != TimeSource::None) bufferAppend(telemetryJson(r, s, now, true));
    }
    Serial.printf("[read] seq=%lu ambient=%.2f humidity=%.1f fridge=%.3f time=%s mqtt=%s buffer=%lu\n",
                  (unsigned long)s, r.ambient, r.humidity, r.fridge, timeSourceName(),
                  mqttConnected ? "up" : "down", (unsigned long)bufferedCount);
  }

  if (mqttConnected && (statusDue || millis() - lastStatus >= STATUS_INTERVAL_MS)) {
    statusDue = false;
    lastStatus = millis();
    publishStatus();
  }

  drainBuffer();
  updateLeds();
  delay(50);
}
