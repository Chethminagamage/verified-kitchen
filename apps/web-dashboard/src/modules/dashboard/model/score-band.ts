import type { ScoreBand } from "./dashboard.model";

/** Presentation bands for a 0–100 score (the score itself comes from the backend). */
export function scoreBand(score: number): ScoreBand {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Moderate";
  return "Poor";
}
