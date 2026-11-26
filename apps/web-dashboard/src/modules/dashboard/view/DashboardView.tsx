import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import PageHeader from "@/shared/components/ui/PageHeader";
import { formatClock } from "@/shared/utils/time";

import { scoreChange, type DashboardOverview } from "../model/dashboard.model";

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
      <PageHeader
        eyebrow="Live kitchen monitoring"
        title="Overview"
        aside={<LiveRefresh kitchenId={kitchenId} tables={["hygiene_scores", "violations"]} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <HygieneScoreCard
          score={data.score}
          change={data.score ? scoreChange(data.trend, data.score.value) : null}
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
          <h3 className="text-lg font-semibold tracking-tight text-slate-950">
            Environmental conditions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {data.sensorsUpdatedAt
              ? data.sensorsLive
                ? `Latest sensor reading at ${formatClock(data.sensorsUpdatedAt, data.timezone)}.`
                : `Sensors offline. Last reading at ${formatClock(data.sensorsUpdatedAt, data.timezone)}.`
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
