import {
  Clock,
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

  const style = BAND_STYLES[score.band];
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
            {score.band}
          </div>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${style.tile}`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>

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
