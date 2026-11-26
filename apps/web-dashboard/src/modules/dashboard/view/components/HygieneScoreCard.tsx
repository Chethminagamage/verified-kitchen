import { ArrowDownRight, ArrowUpRight, Clock, Lock, Minus, ShieldQuestion } from "lucide-react";

import AnimatedNumber from "@/shared/components/ui/AnimatedNumber";
import EmptyState from "@/shared/components/ui/EmptyState";
import Notice from "@/shared/components/ui/Notice";
import { Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForScore } from "@/shared/components/ui/tone";
import { formatClock, formatRelative } from "@/shared/utils/time";

import type { OverallScore } from "../../model/dashboard.model";
import type { Grade } from "../../model/score-details";

import GradeRing from "./GradeRing";

const GRADE_LABEL: Record<Grade, string> = {
  A: "Good",
  B: "Satisfactory",
  C: "Unsatisfactory",
  D: "Very unsatisfactory",
};

const PILLAR_NAMES = {
  personal: "personal hygiene",
  food_prep: "food preparation",
  environmental: "environment",
} as const;

interface HygieneScoreCardProps {
  score: OverallScore | null;
  /** Change since the start of the 24-hour trend; null when there is nothing to compare. */
  change: number | null;
  timezone: string;
  generatedAt: string;
}

function ChangeChip({ change }: { change: number }) {
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const color = change > 0 ? "text-emerald-700" : change < 0 ? "text-red-700" : "text-slate-500";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {change > 0 ? `+${change}` : change} in 24 h
    </span>
  );
}

/** The Overview's hero: grade ring, live score, what limits it and what to fix first. */
export default function HygieneScoreCard({ score, change, timezone, generatedAt }: HygieneScoreCardProps) {
  if (!score) {
    return (
      <Panel className="flex items-center justify-center">
        <EmptyState icon={ShieldQuestion} title="No hygiene score yet">
          The score appears once the camera and sensors start reporting.
        </EmptyState>
      </Panel>
    );
  }

  const { grade, caps, uncapped, issues } = score.explanation;
  const tone = score.isStale ? "neutral" : toneForScore(score.value);

  return (
    <Panel>
      <p className="text-sm font-medium text-slate-500">Overall hygiene score</p>

      <div className="mt-4 flex items-center gap-6">
        <GradeRing score={score.value} grade={grade} tone={tone} />
        <div className="min-w-0">
          <p className="flex items-baseline gap-1">
            <AnimatedNumber
              value={Math.round(score.value)}
              className={`text-5xl font-semibold tracking-tight ${score.isStale ? "text-slate-400" : "text-slate-950"}`}
            />
            <span className="text-lg font-medium text-slate-400">/ 100</span>
          </p>
          {grade && (
            <StatusPill tone={tone} className="mt-3">
              {GRADE_LABEL[grade]}
            </StatusPill>
          )}
          {change !== null && !score.isStale && (
            <p className="mt-2">
              <ChangeChip change={change} />
            </p>
          )}
        </div>
      </div>

      {caps.length > 0 && (
        <Notice tone="warning" icon={Lock} className="mt-5" title={`Limited to ${Math.round(Math.min(...caps.map((c) => c.cap)))}`}>
          {uncapped !== null && <>Would be {Math.round(uncapped)} without this rule. </>}
          {caps.map((c) => c.reason).join(" · ")}
        </Notice>
      )}

      {issues.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Fix first</p>
          <ul className="mt-2 divide-y divide-slate-100">
            {issues.slice(0, 3).map((i) => (
              <li key={i.item} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700">{i.label}</span>
                <span className="font-semibold tabular-nums text-red-700">−{Math.round(i.points)} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {score.missingPillars.length > 0 && (
        <p className="mt-4 text-xs leading-5 text-slate-500">
          No current data for {score.missingPillars.map((p) => PILLAR_NAMES[p]).join(" and ")}; the score uses the
          remaining pillars.
        </p>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        {score.isStale ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            No new data since {formatClock(score.computedAt, timezone)} ({formatRelative(score.computedAt, generatedAt)}).
            Check that the monitoring system is running.
          </p>
        ) : (
          <p className="text-xs text-slate-500">Updated {formatRelative(score.computedAt, generatedAt)}</p>
        )}
      </div>
    </Panel>
  );
}
