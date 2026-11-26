import { CameraOff, Clock } from "lucide-react";

import PillarCard from "@/modules/dashboard/view/components/PillarCard";
import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import Notice from "@/shared/components/ui/Notice";
import PageHeader from "@/shared/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForScore } from "@/shared/components/ui/tone";
import { formatDateTime } from "@/shared/utils/time";

import type { HygienePage } from "../model/hygiene.model";

import HygieneCheckCard from "./components/HygieneCheckCard";

interface HygieneMonitoringViewProps {
  data: HygienePage;
  kitchenId: string;
}

export default function HygieneMonitoringView({ data, kitchenId }: HygieneMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Live hygiene monitoring"
        title="Hygiene Monitoring"
        description={
          <>
            The three hygiene pillars behind the overall score
            {data.overall !== null && <> (currently {Math.round(data.overall)}/100)</>}.
            {data.computedAt && (
              <>
                {" "}Last scored <LiveAge iso={data.computedAt} serverNow={data.generatedAt} />.
              </>
            )}
          </>
        }
        aside={
          <LiveRefresh
            kitchenId={kitchenId}
            tables={["hygiene_scores", "sensor_readings", "violations"]}
            minIntervalMs={3000}
            fallbackMs={30000}
          />
        }
      />

      {(!data.aiConnected || (data.scoreIsStale && data.computedAt)) && (
        <div className="mb-6 space-y-3">
          {!data.aiConnected && (
            <Notice tone="info" icon={CameraOff} title="Camera checks paused">
              The hygiene camera is not sending results right now, so personal hygiene and food preparation are left
              out of the score. The overall score uses the checks that are running; a missing check is never counted
              as 100.
            </Notice>
          )}
          {data.scoreIsStale && data.computedAt && (
            <Notice tone="warning" icon={Clock}>
              No new score since {formatDateTime(data.computedAt, data.timezone)}. Check that the monitoring system is
              running.
            </Notice>
          )}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarCard key={pillar.id} pillar={pillar} />
        ))}
      </section>

      <div className="mt-8 space-y-6">
        {data.pillars.map((pillar, index) => (
          <Panel key={pillar.id}>
            <PanelHeader
              className="border-b border-slate-100 pb-5"
              title={
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">
                    {index + 1}
                  </span>
                  {pillar.name}
                </span>
              }
              description={pillar.description}
              aside={
                <>
                  <span className="text-sm text-slate-500">Pillar score</span>
                  <StatusPill tone={toneForScore(pillar.score)} size="md" icon={null}>
                    {pillar.score === null ? "Paused" : `${Math.round(pillar.score)}%`}
                  </StatusPill>
                </>
              }
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pillar.checks.map((check) => (
                <HygieneCheckCard key={check.id} check={check} generatedAt={data.generatedAt} />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
