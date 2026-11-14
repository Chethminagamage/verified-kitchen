import {
  Clock,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  type LucideIcon,
} from "lucide-react";

import { formatClock, formatRelative } from "@/shared/utils/time";

import type {
  OverallScore,
  ScoreBand,
} from "../../model/dashboard.model";
import type { Grade } from "../../model/score-details";

// H-800 grade -> the same visual language as the bands.
const GRADE_BAND: Record<Grade, ScoreBand> = { A: "Excellent", B: "Moderate", C: "Poor", D: "Poor" };
const GRADE_LABEL: Record<Grade, string> = { A: "Good", B: "Satisfactory", C: "Unsatisfactory", D: "Very unsatisfactory" };

const BAND_STYLES: Record<
  ScoreBand,
  { pill: string; tile: string; icon: LucideIcon }
> = {
  Excellent: { pill: "bg-emerald-50 text-emerald-700", tile: "bg-emerald-500", icon: ShieldCheck },
  Good: { pill: "bg-emerald-50 text-emerald-700", tile: "bg-emerald-500", icon: ShieldCheck },
  Moderate: { pill: "bg-amber-50 text-amber-700", tile: "bg-amber-500", icon: ShieldAlert },
  Poor: { pill: "bg-red-50 text-red-700", tile: "bg-red-500", icon: ShieldX },
};

const PILLAR_NAMES = {
  personal: "personal hygiene",
  food_prep: "food preparation",
  environmental: "environment",
} as const;

interface HygieneScoreCardProps {
  score: OverallScore | null;
  timezone: string;
  generatedAt: string;
}

export default function HygieneScoreCard({
  score,
  timezone,
  generatedAt,
}: HygieneScoreCardProps) {
  if (!score) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Overall Hygiene Score
        </p>

        <p className="mt-4 text-5xl font-bold tracking-tight text-slate-300">
          —
        </p>

        <p className="mt-4 text-sm text-slate-500">
          No scores yet. Start the edge service to begin monitoring.
        </p>
      </section>
    );
  }

  const { grade, caps, uncapped, issues } = score.explanation;
  const style = BAND_STYLES[grade ? GRADE_BAND[grade] : score.band];
  const Icon = style.icon;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Overall Hygiene Score
          </p>

          <div className="mt-4 flex items-end gap-2">
            <span
              className={`text-5xl font-bold tracking-tight ${
                score.isStale ? "text-slate-400" : "text-slate-950"
              }`}
            >
              {Math.round(score.value)}
            </span>

            <span className="pb-1 text-lg font-medium text-slate-400">
              / 100
            </span>
          </div>

          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${style.pill}`}
          >
            <Icon className="h-4 w-4" />
            {grade ? `Grade ${grade} · ${GRADE_LABEL[grade]}` : score.band}
          </div>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style.tile}`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>

      {caps.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="flex items-center gap-1.5 font-semibold">
            <Lock className="h-3.5 w-3.5" />
            Capped at {Math.round(Math.min(...caps.map((c) => c.cap)))}
            {uncapped !== null && <span className="font-normal">(would be {Math.round(uncapped)})</span>}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {caps.map((c) => (
              <li key={c.key}>{c.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fix first</p>
          <ul className="mt-2 space-y-1.5">
            {issues.slice(0, 3).map((i) => (
              <li key={i.item} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-700">{i.label}</span>
                <span className="font-semibold tabular-nums text-red-700">−{Math.round(i.points)} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.missingPillars.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          No current evidence for{" "}
          {score.missingPillars.map((p) => PILLAR_NAMES[p]).join(" and ")};
          score uses the remaining pillars.
        </p>
      )}

      <div className="mt-6 border-t border-slate-100 pt-4">
        {score.isStale ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5" />
            No new data since {formatClock(score.computedAt, timezone)} (
            {formatRelative(score.computedAt, generatedAt)}). Is the edge
            service running?
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Updated {formatRelative(score.computedAt, generatedAt)}
            {score.configVersion && ` · scoring ${score.configVersion}`}
          </p>
        )}
      </div>
    </section>
  );
}
