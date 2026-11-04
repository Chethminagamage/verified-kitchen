import type { Database } from "@/shared/types/database.types";

export type PillarId =
  Database["public"]["Enums"]["hygiene_pillar"];

export type ViolationSeverity =
  Database["public"]["Enums"]["violation_severity"];

export type ViolationStatus =
  Database["public"]["Enums"]["violation_status"];

export type MetricId =
  | "ambient_temp_c"
  | "humidity_pct"
  | "fridge_temp_c";

/** Display band for a 0–100 score (presentation only; the score itself comes from the backend). */
export type ScoreBand =
  | "Excellent"
  | "Good"
  | "Moderate"
  | "Poor";

/** Derived from the per-metric score the backend computed with its validated thresholds. */
export type MetricStatus =
  | "Safe"
  | "Warning"
  | "Critical"
  | "No data";

export interface OverallScore {
  value: number;
  band: ScoreBand;
  computedAt: string;
  /** True when no new score has arrived recently (edge service stopped or offline). */
  isStale: boolean;
  missingPillars: PillarId[];
  configVersion: string | null;
}

export interface PillarScore {
  id: PillarId;
  name: string;
  description: string;
  score: number | null;
}

export interface SensorSummary {
  id: MetricId;
  name: string;
  value: number | null;
  unit: string;
  status: MetricStatus;
}

export interface TrendPoint {
  bucket: string;
  overall: number | null;
  personal: number | null;
  foodPrep: number | null;
  environmental: number | null;
}

export interface ViolationSummary {
  id: string;
  title: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  pillar: PillarId;
  occurredAt: string;
}

export interface DashboardOverview {
  timezone: string;
  generatedAt: string;
  score: OverallScore | null;
  pillars: PillarScore[];
  sensors: SensorSummary[];
  sensorsUpdatedAt: string | null;
  trend: TrendPoint[];
  openViolationCount: number;
  openViolations: ViolationSummary[];
}

/** Scores older than this are flagged as stale on the dashboard. */
export const SCORE_STALE_AFTER_MS = 5 * 60 * 1000;

export const TREND_HOURS = 24;
