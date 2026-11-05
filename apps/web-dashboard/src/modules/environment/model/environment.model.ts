import type { MetricId, MetricStatus } from "@/modules/dashboard/model/dashboard.model";
import type { Database, Json } from "@/shared/types/database.types";

export type { MetricId, MetricStatus };

export type ViolationSeverity = Database["public"]["Enums"]["violation_severity"];
export type ViolationStatus = Database["public"]["Enums"]["violation_status"];

// ---------------------------------------------------------------------
// Time ranges
// ---------------------------------------------------------------------
export const RANGES = ["1h", "24h", "7d"] as const;
export type RangeId = (typeof RANGES)[number];

export const RANGE_CONFIG: Record<RangeId, { label: string; ms: number; bucket: string | null }> = {
  "1h": { label: "Last hour", ms: 60 * 60 * 1000, bucket: null }, // every raw reading
  "24h": { label: "24 hours", ms: 24 * 60 * 60 * 1000, bucket: "5 minutes" },
  "7d": { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000, bucket: "1 hour" },
};

export function parseRange(value: string | string[] | undefined): RangeId {
  const v = Array.isArray(value) ? value[0] : value;
  return RANGES.includes(v as RangeId) ? (v as RangeId) : "24h";
}

// ---------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------
export const METRICS: ReadonlyArray<{
  id: MetricId;
  name: string;
  unit: string;
  sensor: "bme280" | "ds18b20";
  decimals: number;
}> = [
  { id: "ambient_temp_c", name: "Kitchen Temperature", unit: "°C", sensor: "bme280", decimals: 1 },
  { id: "humidity_pct", name: "Humidity", unit: "%", sensor: "bme280", decimals: 0 },
  { id: "fridge_temp_c", name: "Refrigerator", unit: "°C", sensor: "ds18b20", decimals: 1 },
];

export interface SafeRange {
  min: number | null;
  max: number | null;
}

export interface Stats {
  min: number;
  avg: number;
  max: number;
}

export interface ChartPoint {
  t: string;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface MetricSummary {
  id: MetricId;
  name: string;
  unit: string;
  decimals: number;
  value: number | null;
  status: MetricStatus;
  safeRange: SafeRange | null;
  stats24h: Stats | null;
  sensor: "bme280" | "ds18b20";
  /** null = the device has not reported the sensor's health yet. */
  sensorOk: boolean | null;
  points: ChartPoint[];
}

export interface DeviceHealth {
  id: string;
  name: string;
  online: boolean;
  lastSeenAt: string | null;
  firmware: string | null;
  uptimeS: number | null;
  rssi: number | null;
  timeSource: string | null;
  buffered: number | null;
  resetReason: string | null;
  sensors: Record<string, string>;
}

export interface EnvironmentViolation {
  id: string;
  title: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  occurredAt: string;
  sensorValue: number | null;
  sensorUnit: string | null;
}

export interface EnvironmentPage {
  timezone: string;
  generatedAt: string;
  range: RangeId;
  environmentalScore: number | null;
  latestReadingAt: string | null;
  readingIsStale: boolean;
  metrics: MetricSummary[];
  device: DeviceHealth | null;
  violations: EnvironmentViolation[];
}

/** A reading older than this means the node has stopped reporting. */
export const READING_STALE_AFTER_MS = 2 * 60 * 1000;

// ---------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------
function record(value: Json | undefined): Record<string, Json | undefined> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function num(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Safe range for a metric from the active scoring config (never invented by the dashboard). */
export function safeRangeFrom(thresholds: Json | undefined, metric: MetricId): SafeRange | null {
  const entry = record(record(record(thresholds)?.environment)?.[metric]);
  if (!entry) return null;
  const range = { min: num(entry.min), max: num(entry.max) };
  return range.min === null && range.max === null ? null : range;
}

/** Combines bucket statistics; the average is weighted by each bucket's sample count. */
export function combineStats(
  buckets: ReadonlyArray<{ min: number | null; avg: number | null; max: number | null; samples: number }>
): Stats | null {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let n = 0;

  for (const b of buckets) {
    if (b.avg === null || b.min === null || b.max === null || b.samples <= 0) continue;
    min = Math.min(min, b.min);
    max = Math.max(max, b.max);
    sum += b.avg * b.samples;
    n += b.samples;
  }

  return n === 0 ? null : { min, avg: sum / n, max };
}

/** Sensor health as last reported by the node ("ok" / "error"). */
export function sensorHealth(sensors: Record<string, string>, sensor: string): boolean | null {
  const state = sensors[sensor];
  return state === "ok" ? true : state === "error" ? false : null;
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} days`;
}

/** Wi-Fi signal quality for an RSSI in dBm. */
export function signalQuality(rssi: number): "Excellent" | "Good" | "Fair" | "Weak" {
  if (rssi >= -55) return "Excellent";
  if (rssi >= -67) return "Good";
  if (rssi >= -75) return "Fair";
  return "Weak";
}
