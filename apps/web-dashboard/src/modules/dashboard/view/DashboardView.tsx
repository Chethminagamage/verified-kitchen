import type { DashboardOverview } from "../model/dashboard.model";

import HygieneScoreCard from "./components/HygieneScoreCard";
import PillarCard from "./components/PillarCard";
import SensorCard from "./components/SensorCard";

interface DashboardViewProps {
  data: DashboardOverview;
}

export default function DashboardView({
  data,
}: DashboardViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Live Kitchen Monitoring
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Overview
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {data.kitchenName}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <HygieneScoreCard
          score={data.overallScore}
          status={data.hygieneStatus}
          lastUpdated={data.lastUpdated}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {data.pillars.map((pillar) => (
            <PillarCard
              key={pillar.id}
              name={pillar.name}
              score={pillar.score}
              description={pillar.description}
            />
          ))}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">
            Environmental Conditions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Current sensor readings from the kitchen environment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.sensors.map((sensor) => (
            <SensorCard
              key={sensor.id}
              name={sensor.name}
              value={sensor.value}
              unit={sensor.unit}
              status={sensor.status}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Hygiene Score Trend
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Historical hygiene score visualization will be added here.
          </p>
        </div>

        <div className="mt-6 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-400">
            Chart component coming next
          </p>
        </div>
      </section>
    </div>
  );
}