import type {
  EnvironmentalMonitoringData,
} from "../model/environment.model";

import EnvironmentSummaryCard from "./components/EnvironmentSummaryCard";
import EnvironmentalTrendChart from "./components/EnvironmentalTrendChart";
import SensorStatusPanel from "./components/SensorStatusPanel";

interface EnvironmentalMonitoringViewProps {
  data: EnvironmentalMonitoringData;
}

export default function EnvironmentalMonitoringView({
  data,
}: EnvironmentalMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-emerald-600">
          Pillar 3
        </p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Environmental Monitoring
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Monitor kitchen temperature, humidity and
              refrigeration conditions captured by the IoT
              sensor layer.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Environmental Hygiene
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {data.pillarScore}
              <span className="ml-1 text-sm font-medium text-slate-400">
                %
              </span>
            </p>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">
            Current Conditions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Latest readings received from environmental
            monitoring sensors.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.sensors.map((sensor) => (
            <EnvironmentSummaryCard
              key={sensor.id}
              sensor={sensor}
            />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">
            Environmental Trends
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Historical trend view for monitored environmental
            conditions.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {data.sensors.map((sensor) => (
            <EnvironmentalTrendChart
              key={sensor.id}
              sensor={sensor}
            />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">
            Monitoring Information
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Environmental readings contribute to the
            Environmental Hygiene pillar. Final safety ranges,
            normalization rules and score impact will be
            configured from the validated project scoring
            methodology rather than being calculated in this
            dashboard.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Temperature
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                DHT22
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Humidity
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                DHT22
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Refrigeration
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-900">
                DS18B20
              </p>
            </div>
          </div>
        </section>

        <SensorStatusPanel sensors={data.sensors} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Last system update: {data.lastUpdated}
      </p>
    </div>
  );
}