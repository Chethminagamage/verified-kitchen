import LiveAge from "@/shared/components/feedback/LiveAge";
import Meter from "@/shared/components/ui/Meter";
import { Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForScore, toneForStatus } from "@/shared/components/ui/tone";

import type { IndicatorView } from "../../model/ai-monitoring.model";

interface AIDetectionCardProps {
  indicator: IndicatorView;
  generatedAt: string;
}

/** One camera check (e.g. Gloves): live state now and compliance over the last hour. */
export default function AIDetectionCard({ indicator, generatedAt }: AIDetectionCardProps) {
  const rate = indicator.complianceRate;

  return (
    <Panel as="article" interactive className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-950">{indicator.name}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{indicator.requirement}</p>
        </div>
        <StatusPill tone={toneForStatus(indicator.state)}>{indicator.state}</StatusPill>
      </div>

      <div className="mt-4 flex-1 border-t border-slate-100 pt-4">
        {rate === null ? (
          <p className="text-sm text-slate-500">No checks in the last hour.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-500">Compliant, last hour</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {Math.round(rate)}%
                <span className="ml-1 text-xs font-normal text-slate-500">of {indicator.windowsLastHour} checks</span>
              </span>
            </div>
            <Meter value={rate} tone={toneForScore(rate)} label={`${indicator.name} compliance`} className="mt-2" />
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {indicator.lastChecked ? (
          <>
            Last seen <LiveAge iso={indicator.lastChecked} serverNow={generatedAt} />
          </>
        ) : (
          "Not seen in the last hour"
        )}
      </p>
    </Panel>
  );
}
