import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import { formatClock } from "@/shared/utils/time";

import type { DashboardOverview } from "../model/dashboard.model";

import HygieneScoreCard from "./components/HygieneScoreCard";
import OpenViolationsPanel from "./components/OpenViolationsPanel";
import PillarCard from "./components/PillarCard";
import ScoreTrendChart from "./components/ScoreTrendChart";
import SensorCard from "./components/SensorCard";

interface DashboardViewProps {
  data: DashboardOverview;
  kitchenId: string;
}

export default function DashboardView({
  data,
  kitchenId,
}: DashboardViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">
            Live Kitchen Monitoring
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Overview
          </h2>
        </div>

        <LiveRefresh
          kitchenId={kitchenId}
          tables={["hygiene_scores", "violations"]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <HygieneScoreCard
          score={data.score}
          timezone={data.timezone}
          generatedAt={data.generatedAt}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {data.pillars.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">
            Environmental Conditions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {data.sensorsUpdatedAt
              ? `Latest ESP32 reading at ${formatClock(data.sensorsUpdatedAt, data.timezone)}.`
              : "No sensor readings yet."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.sensors.map((sensor) => (
            <SensorCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ScoreTrendChart data={data.trend} timezone={data.timezone} />

        <OpenViolationsPanel
          violations={data.openViolations}
          total={data.openViolationCount}
          generatedAt={data.generatedAt}
        />
      </div>
    </div>
  );
}
