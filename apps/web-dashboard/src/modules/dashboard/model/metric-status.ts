import type { Json } from "@/shared/types/database.types";

import type { MetricId, MetricStatus, PillarId } from "./dashboard.model";

export function isRecord(value: Json | undefined): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Status of a metric from the score the backend gave it (100 = inside the
 * safe band, 0 = at or beyond the tolerance). The dashboard never applies
 * its own thresholds.
 */
export function metricStatus(details: Json | undefined, metric: MetricId): MetricStatus {
  const environment = isRecord(details) ? details.environment : undefined;
  const entry = isRecord(environment) ? environment[metric] : undefined;
  const score = isRecord(entry) ? entry.score : undefined;

  if (typeof score !== "number") return "No data";
  if (score >= 100) return "Safe";
  if (score > 0) return "Warning";
  return "Critical";
}

/** A sensor reading older than this means the node has stopped reporting. */
export const SENSOR_FEED_STALE_AFTER_MS = 2 * 60 * 1000;

/**
 * True while the environmental node is actually reporting: its latest reading is
 * recent and the broker has not published its "offline" last will.
 */
export function sensorFeedLive(latestReadingAt: string | null, nodeReportedOffline: boolean, now: number): boolean {
  if (!latestReadingAt || nodeReportedOffline) return false;
  return now - new Date(latestReadingAt).getTime() <= SENSOR_FEED_STALE_AFTER_MS;
}

/** Status shown next to a sensor value: never "Safe"/"Critical" for a value that is no longer live. */
export function liveMetricStatus(
  value: number | null,
  details: Json | undefined,
  metric: MetricId,
  live: boolean
): MetricStatus {
  if (value === null) return "No data";
  if (!live) return "Offline";
  return metricStatus(details, metric);
}

export function missingPillars(details: Json): PillarId[] {
  if (!isRecord(details) || !Array.isArray(details.missing_pillars)) {
    return [];
  }

  return details.missing_pillars.filter(
    (p): p is PillarId =>
      p === "personal" || p === "food_prep" || p === "environmental"
  );
}
