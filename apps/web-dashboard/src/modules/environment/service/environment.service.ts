import { metricStatus } from "@/modules/dashboard/model/metric-status";
import { isDeviceOnline } from "@/modules/system-status/model/connection";
import type { Json } from "@/shared/types/database.types";

import {
  METRICS,
  RANGE_CONFIG,
  READING_STALE_AFTER_MS,
  combineStats,
  safeRangeFrom,
  sensorHealth,
  type ChartPoint,
  type DeviceHealth,
  type EnvironmentPage,
  type MetricId,
  type RangeId,
} from "../model/environment.model";
import {
  EnvironmentRepository,
  type BucketRow,
  type DeviceRow,
  type ReadingRow,
} from "../repository/environment.repository";

const BUCKET_KEYS: Record<MetricId, { avg: keyof BucketRow; min: keyof BucketRow; max: keyof BucketRow }> = {
  ambient_temp_c: { avg: "ambient_avg", min: "ambient_min", max: "ambient_max" },
  humidity_pct: { avg: "humidity_avg", min: "humidity_min", max: "humidity_max" },
  fridge_temp_c: { avg: "fridge_avg", min: "fridge_min", max: "fridge_max" },
};

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bucketPoints(rows: BucketRow[], metric: MetricId): ChartPoint[] {
  const k = BUCKET_KEYS[metric];
  return rows.map((r) => ({ t: r.bucket, avg: asNumber(r[k.avg]), min: asNumber(r[k.min]), max: asNumber(r[k.max]) }));
}

function rawPoints(rows: ReadingRow[], metric: MetricId): ChartPoint[] {
  return rows.map((r) => {
    const v = r[metric];
    return { t: r.device_ts, avg: v, min: v, max: v };
  });
}

function record(value: Json | null | undefined): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function deviceHealth(row: DeviceRow, now: number): DeviceHealth {
  const s = record(row.last_status);
  const sensors: Record<string, string> = {};
  const reported = record(s.sensors);
  for (const [name, state] of Object.entries(reported)) {
    // The edge service also records the clock source here; it is not a sensor.
    if (name !== "time_source" && typeof state === "string") sensors[name] = state;
  }
  const timeSource = typeof s.time_source === "string" ? s.time_source : reported.time_source;
  const online =
    s.state !== "offline" &&
    isDeviceOnline({ id: row.id, name: row.name, type: "env_node", lastSeenAt: row.last_seen_at }, now);

  return {
    id: row.id,
    name: row.name,
    online,
    lastSeenAt: row.last_seen_at,
    firmware: typeof s.fw === "string" ? s.fw : null,
    uptimeS: asNumber(s.uptime_s),
    rssi: asNumber(s.rssi),
    timeSource: typeof timeSource === "string" ? timeSource : null,
    buffered: asNumber(s.buffer),
    resetReason: typeof s.reset_reason === "string" ? s.reset_reason : null,
    sensors,
  };
}

export class EnvironmentService {
  constructor(private readonly repository = new EnvironmentRepository()) {}

  async getPage(kitchenId: string, timezone: string, range: RangeId, now = new Date()): Promise<EnvironmentPage> {
    const config = RANGE_CONFIG[range];
    const from = new Date(now.getTime() - config.ms);
    const dayAgo = new Date(now.getTime() - RANGE_CONFIG["24h"].ms);

    const [latest, day, chartRows, score, thresholds, node, violations] = await Promise.all([
      this.repository.latestReading(kitchenId),
      this.repository.buckets(kitchenId, dayAgo, now, "5 minutes"),
      config.bucket === null
        ? this.repository.readings(kitchenId, from, now)
        : range === "24h"
          ? null // reuse the 24 h buckets below
          : this.repository.buckets(kitchenId, from, now, config.bucket),
      this.repository.latestScore(kitchenId),
      this.repository.activeThresholds(),
      this.repository.environmentNode(kitchenId),
      this.repository.recentViolations(kitchenId, 5),
    ]);

    const device = node ? deviceHealth(node, now.getTime()) : null;
    const sensors = device?.sensors ?? {};

    const metrics = METRICS.map((m) => {
      const points =
        config.bucket === null
          ? rawPoints(chartRows as ReadingRow[], m.id)
          : bucketPoints((chartRows as BucketRow[] | null) ?? day, m.id);
      const k = BUCKET_KEYS[m.id];
      const value = latest?.[m.id] ?? null;

      return {
        id: m.id,
        name: m.name,
        unit: m.unit,
        decimals: m.decimals,
        sensor: m.sensor,
        value,
        // Status comes from the backend's metric score, never local thresholds.
        status: value === null ? ("No data" as const) : metricStatus(score?.details, m.id),
        safeRange: safeRangeFrom(thresholds ?? undefined, m.id),
        stats24h: combineStats(
          day.map((b) => ({
            min: asNumber(b[k.min]),
            avg: asNumber(b[k.avg]),
            max: asNumber(b[k.max]),
            samples: Number(b.samples),
          }))
        ),
        sensorOk: sensorHealth(sensors, m.sensor),
        points,
      };
    });

    return {
      timezone,
      generatedAt: now.toISOString(),
      range,
      environmentalScore: score?.environmental_score ?? null,
      latestReadingAt: latest?.device_ts ?? null,
      readingIsStale:
        !latest || now.getTime() - new Date(latest.device_ts).getTime() > READING_STALE_AFTER_MS,
      metrics,
      device,
      violations: violations.map((v) => ({
        id: v.id,
        title: v.title,
        severity: v.severity,
        status: v.status,
        occurredAt: v.occurred_at,
        sensorValue: v.sensor_value,
        sensorUnit: v.sensor_unit,
      })),
    };
  }
}
