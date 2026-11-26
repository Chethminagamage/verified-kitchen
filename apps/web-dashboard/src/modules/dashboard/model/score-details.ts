import type { Json } from "@/shared/types/database.types";

/**
 * Reads the explainability breakdown the edge service stores with every score
 * (hygiene_scores.details). The dashboard never recomputes the score; it only
 * presents what the scoring engine decided and why.
 */

export type Grade = "A" | "B" | "C" | "D";

export interface ScoreCap {
  key: string;
  cap: number;
  reason: string;
  since: string | null;
}

export interface ScoreIssue {
  item: string;
  label: string;
  /** Overall-score points this item cost in the current window. */
  points: number;
}

export interface ScoreExplanation {
  grade: Grade | null;
  /** Score before a cap; null when no cap applied. */
  uncapped: number | null;
  caps: ScoreCap[];
  issues: ScoreIssue[];
}

export const ITEM_LABELS: Record<string, string> = {
  gloves: "Gloves",
  hairnet: "Hairnet",
  mask: "Mask",
  surface: "Preparation surface",
  food_spill: "Food spills",
  food_waste: "Food waste",
  fridge_temp_c: "Refrigerator temperature",
  ambient_temp_c: "Kitchen temperature",
  humidity_pct: "Humidity",
};

/** Items costing less than this are noise, not something to fix. */
const MIN_ISSUE_POINTS = 1;

function record(value: Json | undefined): Record<string, Json | undefined> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}

function num(value: Json | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function explainScore(details: Json | undefined, overall: number): ScoreExplanation {
  const d = record(details) ?? {};
  const grade = typeof d.grade === "string" && ["A", "B", "C", "D"].includes(d.grade) ? (d.grade as Grade) : null;

  const caps: ScoreCap[] = (Array.isArray(d.caps_applied) ? d.caps_applied : []).flatMap((c) => {
    const r = record(c);
    const cap = num(r?.cap);
    if (!r || cap === null || typeof r.reason !== "string" || typeof r.key !== "string") return [];
    return [{ key: r.key, cap, reason: r.reason, since: typeof r.since === "string" ? r.since : null }];
  });

  const uncappedRaw = num(d.uncapped_overall);
  const uncapped = caps.length > 0 && uncappedRaw !== null && uncappedRaw > overall ? uncappedRaw : null;

  const issues: ScoreIssue[] = (Array.isArray(d.impacts) ? d.impacts : [])
    .flatMap((i) => {
      const r = record(i);
      const points = num(r?.points);
      if (!r || typeof r.item !== "string" || points === null || points < MIN_ISSUE_POINTS) return [];
      return [{ item: r.item, label: ITEM_LABELS[r.item] ?? r.item, points }];
    })
    .sort((a, b) => b.points - a.points);

  return { grade, uncapped, caps, issues };
}
