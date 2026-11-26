import type { Json } from "@/shared/types/database.types";

// ---------------------------------------------------------------------
// What the page shows
//
// The camera process (edge-service vision) analyses video on the edge
// computer and sends one aggregated result per indicator per 5-second
// window: PPE (pillar 1) and the food-preparation area (pillar 2). The page
// shows those results and the camera's health. It never receives or
// displays images.
// ---------------------------------------------------------------------

export type PpeIndicatorId = "hairnet" | "mask" | "gloves";

export const PPE_INDICATORS: ReadonlyArray<{ id: PpeIndicatorId; name: string; requirement: string }> = [
  { id: "hairnet", name: "Hairnet", requirement: "Hair fully covered" },
  { id: "mask", name: "Mask", requirement: "Mask over nose and mouth" },
  { id: "gloves", name: "Gloves", requirement: "Both hands gloved" },
];

/**
 * Pillar 2 cards. "Preparation surface" pools the clean- and dirty-surface results,
 * exactly as the scoring engine's "surface" item does.
 */
export const FOOD_PREP_CARDS: ReadonlyArray<{ id: string; name: string; requirement: string; indicators: string[] }> = [
  {
    id: "surface",
    name: "Preparation surface",
    requirement: "Board / counter free of scraps and residue",
    indicators: ["clean_surface", "dirty_surface"],
  },
  { id: "food_waste", name: "Food waste", requirement: "No scraps left on the preparation area", indicators: ["food_waste"] },
];

/** Display names of stored indicators (event log). */
export const INDICATOR_NAMES: Readonly<Record<string, string>> = {
  hairnet: "Hairnet",
  mask: "Mask",
  gloves: "Gloves",
  clean_surface: "Surface: clean",
  dirty_surface: "Surface: dirty",
  food_waste: "Food waste",
  food_spill: "Food spill",
};

/** A window older than this is not "now": the worker left the view or the camera stopped. */
export const LIVE_WINDOW_MS = 60 * 1000;
/** History shown on the page (compliance rate, event log). */
export const HISTORY_MS = 60 * 60 * 1000;
/** Rows per page in "Recent checks". */
export const EVENTS_PAGE_SIZE = 15;

export type LiveState = "Compliant" | "Non-Compliant" | "Not in view";

export interface DetectionRow {
  detected_at: string;
  indicator: string;
  compliant: boolean;
  confidence: number;
  inference_ms: number | null;
  model_version: string;
  metadata: Json;
}

export interface IndicatorView {
  id: string;
  name: string;
  requirement: string;
  state: LiveState;
  /** Mean confidence of the frames behind the latest decision (0-1). */
  confidence: number | null;
  /** Frames supporting / observing the indicator in the latest window. */
  framesCompliant: number | null;
  framesObserved: number | null;
  lastChecked: string | null;
  /** Share of windows in the last hour in which the indicator was compliant (0-100). */
  complianceRate: number | null;
  windowsLastHour: number;
}

export interface CameraView {
  installed: boolean;
  online: boolean;
  /** "ok" = frames arriving; "error" = process running but no frames; "stopped" = shut down cleanly. */
  camera: string | null;
  source: string | null;
  modelVersion: string | null;
  fps: number | null;
  inferenceMs: number | null;
  region: string | null;
  privacy: string | null;
  lastSeenAt: string | null;
}

export interface DetectionEvent {
  key: string;
  at: string;
  indicator: string;
  compliant: boolean;
  confidence: number;
  framesCompliant: number | null;
  framesObserved: number | null;
}

export interface AIMonitoringPage {
  timezone: string;
  generatedAt: string;
  camera: CameraView;
  indicators: IndicatorView[];
  /** The current page of "Recent checks" (newest first, last hour). */
  events: DetectionEvent[];
  eventsPagination: { page: number; pageCount: number; total: number; first: number; last: number };
  foodPrep: IndicatorView[];
  personalScore: number | null;
  foodPrepScore: number | null;
  windowsLastHour: number;
  meanInferenceMs: number | null;
}

// ---------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------
function record(value: Json | null | undefined): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function num(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: Json | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Frame counts the camera attached to a window (metadata from the MQTT contract). */
export function windowFrames(metadata: Json): { compliant: number | null; observed: number | null } {
  const m = record(metadata);
  return { compliant: num(m.frames_compliant), observed: num(m.frames_observed) };
}

/** Live state of one indicator from its newest window. */
export function liveState(latest: DetectionRow | undefined, now: number): LiveState {
  if (!latest || now - new Date(latest.detected_at).getTime() > LIVE_WINDOW_MS) return "Not in view";
  return latest.compliant ? "Compliant" : "Non-Compliant";
}

/**
 * One newest-first history from several indicators that describe the same item.
 * Within a window, a breach is listed first, so the live state shows it.
 */
export function pooledHistory(byIndicator: ReadonlyMap<string, DetectionRow[]>, ids: readonly string[]): DetectionRow[] {
  return ids
    .flatMap((id) => byIndicator.get(id) ?? [])
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at) || Number(a.compliant) - Number(b.compliant));
}

/** Percentage of windows that were compliant; null without windows. */
export function complianceRate(rows: ReadonlyArray<Pick<DetectionRow, "compliant">>): number | null {
  if (rows.length === 0) return null;
  return (100 * rows.filter((r) => r.compliant).length) / rows.length;
}

/** Camera health from devices.last_status (published by the camera process). */
export function cameraStatusFields(status: Json): Omit<CameraView, "installed" | "online" | "lastSeenAt"> {
  const s = record(status);
  return {
    camera: str(s.camera),
    source: str(s.source),
    modelVersion: str(s.model_version),
    fps: num(s.fps),
    inferenceMs: num(s.inference_ms),
    region: str(s.roi),
    privacy: str(s.privacy),
  };
}

/** "ppe_yolo26n_best@ada23a1ecd47" -> { name: "ppe_yolo26n_best", hash: "ada23a1ecd47" } */
export function splitModelVersion(version: string | null): { name: string; hash: string | null } | null {
  if (!version) return null;
  const at = version.lastIndexOf("@");
  return at > 0 ? { name: version.slice(0, at), hash: version.slice(at + 1) } : { name: version, hash: null };
}
