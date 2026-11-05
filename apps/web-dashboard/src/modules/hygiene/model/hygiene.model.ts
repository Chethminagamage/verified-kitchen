import type { MetricId, MetricStatus, PillarId } from "@/modules/dashboard/model/dashboard.model";
import type { Json } from "@/shared/types/database.types";

export type { MetricId, PillarId };

export type IndicatorId =
  | "hairnet"
  | "mask"
  | "gloves"
  | "clean_surface"
  | "dirty_surface"
  | "food_spill"
  | "food_waste";

export type AiCheckStatus = "Compliant" | "Non-Compliant" | "No evidence";
export type CheckStatus = AiCheckStatus | MetricStatus;

export interface HygieneCheck {
  id: string;
  name: string;
  source: "AI" | "Sensor";
  status: CheckStatus;
  /** AI: share of confident detections that were compliant in the last scoring window. */
  compliancePct: number | null;
  /** AI: mean model confidence (0–1). */
  confidence: number | null;
  samples: number | null;
  /** Sensor: latest value. */
  value: number | null;
  unit: string | null;
  decimals: number;
  safeRange: { min: number | null; max: number | null } | null;
  lastChecked: string | null;
}

export interface HygienePillar {
  id: PillarId;
  name: string;
  description: string;
  score: number | null;
  checks: HygieneCheck[];
}

export interface HygienePage {
  timezone: string;
  generatedAt: string;
  overall: number | null;
  computedAt: string | null;
  scoreIsStale: boolean;
  /** True when AI evidence arrived recently (camera service running). */
  aiConnected: boolean;
  pillars: HygienePillar[];
}

export const INDICATORS: ReadonlyArray<{ id: IndicatorId; name: string; pillar: Extract<PillarId, "personal" | "food_prep"> }> = [
  { id: "hairnet", name: "Hairnet", pillar: "personal" },
  { id: "mask", name: "Mask", pillar: "personal" },
  { id: "gloves", name: "Gloves", pillar: "personal" },
  { id: "clean_surface", name: "Clean preparation surface", pillar: "food_prep" },
  { id: "dirty_surface", name: "No dirty surfaces", pillar: "food_prep" },
  { id: "food_spill", name: "No food spills", pillar: "food_prep" },
  { id: "food_waste", name: "No food waste", pillar: "food_prep" },
];

export const PILLAR_INFO: Record<PillarId, { name: string; description: string }> = {
  personal: { name: "Personal Hygiene", description: "AI checks of hairnet, mask and gloves at the workstation." },
  food_prep: {
    name: "Food Preparation Hygiene",
    description: "AI checks of the preparation surface for cleanliness, spills and waste.",
  },
  environmental: {
    name: "Environmental Hygiene",
    description: "ESP32 sensing of kitchen temperature, humidity and refrigerator temperature.",
  },
};

/** AI evidence older than this means the camera service is not running. */
export const AI_STALE_AFTER_MS = 2 * 60 * 1000;
export const SCORE_STALE_AFTER_MS = 5 * 60 * 1000;

export interface IndicatorBreakdown {
  score: number | null;
  confidentSamples: number | null;
  meanConfidence: number | null;
}

function record(value: Json | undefined): Record<string, Json | undefined> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function num(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Per-indicator breakdown the edge service stored in hygiene_scores.details. */
export function indicatorBreakdown(details: Json | undefined, indicator: IndicatorId): IndicatorBreakdown {
  const entry = record(record(record(details)?.indicators)?.[indicator]);
  return {
    score: num(entry?.score),
    confidentSamples: num(entry?.confident_samples),
    meanConfidence: num(entry?.mean_confidence),
  };
}

/**
 * An indicator is non-compliant only when the backend has raised a violation
 * for it that is still open; without evidence it is "No evidence", never assumed.
 */
export function aiCheckStatus(score: number | null, hasOpenViolation: boolean): AiCheckStatus {
  if (hasOpenViolation) return "Non-Compliant";
  return score === null ? "No evidence" : "Compliant";
}
