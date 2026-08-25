import type {
  HygieneMonitoringData,
} from "../model/hygiene.model";

import HygieneCheckCard from "./components/HygieneCheckCard";
import PillarSummaryCard from "./components/PillarSummaryCard";

interface HygieneMonitoringViewProps {
  data: HygieneMonitoringData;
}

export default function HygieneMonitoringView({
  data,
}: HygieneMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Live Hygiene Monitoring
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Hygiene Monitoring
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Monitor the three hygiene pillars used to determine the
          current Verified Kitchen hygiene score.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarSummaryCard
            key={pillar.id}
            name={pillar.name}
            score={pillar.score}
          />
        ))}
      </section>

      <section className="mt-8 space-y-6">
        {data.pillars.map((pillar, index) => (
          <article
            key={pillar.id}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                    {index + 1}
                  </span>

                  <h3 className="text-lg font-semibold text-slate-950">
                    {pillar.name}
                  </h3>
                </div>

                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  {pillar.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Pillar Score
                </span>

                <span className="rounded-lg bg-slate-950 px-3 py-1.5 text-sm font-bold text-white">
                  {pillar.score}%
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pillar.checks.map((check) => (
                <HygieneCheckCard
                  key={check.id}
                  check={check}
                />
              ))}
            </div>
          </article>
        ))}
      </section>

      <p className="mt-6 text-xs text-slate-400">
        Last system update: {data.lastUpdated}
      </p>
    </div>
  );
}