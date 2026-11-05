import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import { formatDateTime } from "@/shared/utils/time";

import { RANGE_CONFIG, RANGES, type EnvironmentPage, type ViolationSeverity } from "../model/environment.model";

import DeviceHealthPanel from "./components/DeviceHealthPanel";
import MetricCard from "./components/MetricCard";
import SensorHistoryChart from "./components/SensorHistoryChart";

const SEVERITY_STYLES: Record<ViolationSeverity, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

interface EnvironmentalMonitoringViewProps {
  data: EnvironmentPage;
  kitchenId: string;
}

export default function EnvironmentalMonitoringView({ data, kitchenId }: EnvironmentalMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Pillar 3 · IoT Sensing</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Environmental Monitoring
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {data.latestReadingAt ? (
              <>
                Latest ESP32 reading <LiveAge iso={data.latestReadingAt} serverNow={data.generatedAt} />
                {data.environmentalScore !== null && (
                  <> · Environmental score {Math.round(data.environmentalScore)}/100</>
                )}
              </>
            ) : (
              "No readings yet. Start the sensor node and the edge service."
            )}
          </p>
        </div>

        {/* Readings arrive every 30 s; the page refreshes on each one. */}
        <LiveRefresh kitchenId={kitchenId} tables={["sensor_readings", "devices", "violations"]} minIntervalMs={2000} fallbackMs={30000} />
      </div>

      {data.readingIsStale && data.latestReadingAt && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          No new reading since {formatDateTime(data.latestReadingAt, data.timezone)}. Check that the sensor node is
          powered and connected, and that the edge service is running.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {data.metrics.map((m) => (
          <MetricCard key={m.id} metric={m} stale={data.readingIsStale} />
        ))}
      </section>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-950">History</h3>
        <nav aria-label="Time range" className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={r === "24h" ? "?" : `?range=${r}`}
              scroll={false}
              aria-current={data.range === r ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                data.range === r ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {RANGE_CONFIG[r].label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {data.metrics.map((m) => (
            <SensorHistoryChart key={m.id} metric={m} range={data.range} timezone={data.timezone} />
          ))}
        </div>

        <div className="space-y-6">
          <DeviceHealthPanel device={data.device} timezone={data.timezone} generatedAt={data.generatedAt} />

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">Recent Environmental Violations</h3>
              <Link
                href="/dashboard/violations?pillar=environmental&status=all"
                className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
              >
                All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {data.violations.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">None recorded.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.violations.map((v) => (
                  <li key={v.id} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-0.5 w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold capitalize ${SEVERITY_STYLES[v.severity]}`}
                    >
                      {v.severity}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium text-slate-900">{v.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(v.occurredAt, data.timezone)}
                        {v.sensorValue !== null && ` · ${v.sensorValue.toFixed(1)} ${v.sensorUnit ?? ""}`}
                        {` · ${v.status}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
