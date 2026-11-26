import { Camera, RadioTower, WifiOff } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import Meter from "@/shared/components/ui/Meter";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForStatus } from "@/shared/components/ui/tone";

import type { HygieneCheck } from "../../model/hygiene.model";

function formatRange(range: NonNullable<HygieneCheck["safeRange"]>, unit: string | null): string {
  const u = unit ? ` ${unit}` : "";
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max}${u}`;
  return range.max !== null ? `≤ ${range.max}${u}` : `≥ ${range.min}${u}`;
}

/** What to show instead of a number when a check has nothing to report. */
function quietReason(check: HygieneCheck): string {
  if (check.status === "Offline") return "Sensor offline";
  return check.source === "AI" ? "Not seen by the camera recently" : "No recent reading";
}

/** One hygiene item (e.g. Gloves, Fridge temperature) with its live state. */
export default function HygieneCheckCard({ check, generatedAt }: { check: HygieneCheck; generatedAt: string }) {
  const tone = toneForStatus(check.status);
  const quiet = check.source === "AI" ? check.compliancePct === null : check.value === null;

  return (
    <article className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{check.name}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            {check.source === "AI" ? <Camera className="h-3.5 w-3.5" aria-hidden /> : <RadioTower className="h-3.5 w-3.5" aria-hidden />}
            {check.source === "AI" ? "Camera" : "Sensor"}
          </p>
        </div>
        <StatusPill tone={tone} icon={check.status === "Offline" ? WifiOff : undefined}>
          {check.status}
        </StatusPill>
      </div>

      <div className="mt-4 flex-1 border-t border-slate-100 pt-4">
        {quiet ? (
          <p className="text-sm text-slate-500">{quietReason(check)}</p>
        ) : check.source === "AI" ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Compliance, last minute</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{Math.round(check.compliancePct ?? 0)}%</span>
            </div>
            <Meter value={check.compliancePct} tone={tone} label={`${check.name} compliance`} className="mt-2" />
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Current reading</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {check.value?.toFixed(check.decimals)} {check.unit}
              </span>
            </div>
            {check.safeRange && (
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-500">Safe range</span>
                <span className="text-sm tabular-nums text-slate-700">{formatRange(check.safeRange, check.unit)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Last checked {check.lastChecked ? <LiveAge iso={check.lastChecked} serverNow={generatedAt} /> : "never"}
      </p>
    </article>
  );
}
