import { CircleAlert, CircleCheck, CircleDashed, type LucideIcon } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";

import type { IndicatorView, LiveState } from "../../model/ai-monitoring.model";

const STATE: Record<LiveState, { className: string; icon: LucideIcon }> = {
  Compliant: { className: "bg-emerald-50 text-emerald-700", icon: CircleCheck },
  "Non-Compliant": { className: "bg-red-50 text-red-700", icon: CircleAlert },
  "Not in view": { className: "bg-slate-100 text-slate-500", icon: CircleDashed },
};

interface AIDetectionCardProps {
  indicator: IndicatorView;
  generatedAt: string;
}

export default function AIDetectionCard({ indicator, generatedAt }: AIDetectionCardProps) {
  const state = STATE[indicator.state];
  const StateIcon = state.icon;
  const rate = indicator.complianceRate;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-950">{indicator.name}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{indicator.requirement}</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${state.className}`}>
          <StateIcon className="h-3.5 w-3.5" />
          {indicator.state}
        </span>
      </div>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Confidence</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {indicator.confidence === null ? "—" : `${Math.round(indicator.confidence * 100)}%`}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-500">Frames in last window</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {indicator.framesObserved === null
              ? "—"
              : `${indicator.state === "Compliant" ? indicator.framesCompliant : (indicator.framesObserved ?? 0) - (indicator.framesCompliant ?? 0)} of ${indicator.framesObserved}`}
          </dd>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Compliant, last hour</dt>
            <dd className="font-semibold tabular-nums text-slate-900">
              {rate === null ? "—" : `${Math.round(rate)}%`}
              {indicator.windowsLastHour > 0 && (
                <span className="ml-1 text-xs font-normal text-slate-500">of {indicator.windowsLastHour} windows</span>
              )}
            </dd>
          </div>
          {rate !== null && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
            </div>
          )}
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-400">
        {indicator.lastChecked ? (
          <>
            Last seen <LiveAge iso={indicator.lastChecked} serverNow={generatedAt} />
          </>
        ) : (
          "Not seen in the last hour"
        )}
      </p>
    </article>
  );
}
