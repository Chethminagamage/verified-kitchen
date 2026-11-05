import { Camera, Clock } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import { formatDateTime } from "@/shared/utils/time";

import type { HygienePage } from "../model/hygiene.model";

import HygieneCheckCard from "./components/HygieneCheckCard";
import PillarSummaryCard from "./components/PillarSummaryCard";

interface HygieneMonitoringViewProps {
  data: HygienePage;
  kitchenId: string;
}

export default function HygieneMonitoringView({ data, kitchenId }: HygieneMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Live Hygiene Monitoring</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Hygiene Monitoring</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            The three hygiene pillars behind the overall score
            {data.overall !== null && <> (currently {Math.round(data.overall)}/100)</>}.
            {data.computedAt && (
              <>
                {" "}Last scored <LiveAge iso={data.computedAt} serverNow={data.generatedAt} />.
              </>
            )}
          </p>
        </div>
        <LiveRefresh
          kitchenId={kitchenId}
          tables={["hygiene_scores", "sensor_readings", "violations"]}
          minIntervalMs={3000}
          fallbackMs={30000}
        />
      </div>

      {!data.aiConnected && (
        <p className="mb-6 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <Camera className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The camera / YOLO service is not connected yet, so Pillars 1 and 2 have no evidence. The overall
            score currently uses the environmental pillar only (weights are re-normalised over pillars with
            evidence).
          </span>
        </p>
      )}

      {data.scoreIsStale && data.computedAt && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          No new score since {formatDateTime(data.computedAt, data.timezone)}. Is the edge service running?
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarSummaryCard key={pillar.id} pillar={pillar} />
        ))}
      </section>

      <section className="mt-8 space-y-6">
        {data.pillars.map((pillar, index) => (
          <article key={pillar.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-950">{pillar.name}</h3>
                </div>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">{pillar.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Pillar score</span>
                <span className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
                  {pillar.score === null ? "No evidence" : `${Math.round(pillar.score)}%`}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pillar.checks.map((check) => (
                <HygieneCheckCard key={check.id} check={check} generatedAt={data.generatedAt} />
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
