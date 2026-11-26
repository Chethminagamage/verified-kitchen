import Link from "next/link";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";

import ViolationSeverityBadge from "@/modules/violations/view/components/ViolationSeverityBadge";
import LiveAge from "@/shared/components/feedback/LiveAge";
import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import EmptyState from "@/shared/components/ui/EmptyState";
import Notice from "@/shared/components/ui/Notice";
import PageHeader from "@/shared/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import { formatDateTime } from "@/shared/utils/time";

import { RANGE_CONFIG, RANGES, type EnvironmentPage } from "../model/environment.model";

import DeviceHealthPanel from "./components/DeviceHealthPanel";
import MetricCard from "./components/MetricCard";
import SensorHistoryChart from "./components/SensorHistoryChart";

interface EnvironmentalMonitoringViewProps {
  data: EnvironmentPage;
  kitchenId: string;
}

export default function EnvironmentalMonitoringView({ data, kitchenId }: EnvironmentalMonitoringViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Pillar 3 · Kitchen sensors"
        title="Environmental Monitoring"
        description={
          data.latestReadingAt ? (
            <>
              Latest reading <LiveAge iso={data.latestReadingAt} serverNow={data.generatedAt} />
              {data.environmentalScore !== null && <> · Environmental score {Math.round(data.environmentalScore)}/100</>}
            </>
          ) : (
            "No readings yet. Check that the kitchen sensors are switched on."
          )
        }
        aside={
          // Readings arrive every 30 s; the page refreshes on each one.
          <LiveRefresh
            kitchenId={kitchenId}
            tables={["sensor_readings", "devices", "violations"]}
            minIntervalMs={2000}
            fallbackMs={30000}
          />
        }
      />

      {data.readingIsStale && data.latestReadingAt && (
        <Notice
          tone="warning"
          icon={Clock}
          className="mb-6"
          title={data.device && !data.device.online ? "The kitchen sensors are offline" : "No new reading is arriving"}
        >
          The values below are the last ones received, at {formatDateTime(data.latestReadingAt, data.timezone)}. Check
          that the sensors are switched on and connected to Wi-Fi, and that the monitoring system is running.
        </Notice>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {data.metrics.map((m) => (
          <MetricCard key={m.id} metric={m} stale={data.readingIsStale} />
        ))}
      </section>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-slate-950">History</h3>
        <nav aria-label="Time range" className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-card">
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

          <Panel>
            <PanelHeader
              title="Recent environmental violations"
              aside={
                <Link
                  href="/dashboard/violations?pillar=environmental&status=all"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
                >
                  All <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            />

            {data.violations.length === 0 ? (
              <EmptyState icon={ShieldCheck} tone="positive" title="None recorded" compact className="mt-2">
                The kitchen air and fridge have stayed within their safe ranges.
              </EmptyState>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {data.violations.map((v) => (
                  <li key={v.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 py-3">
                    <div className="pt-0.5">
                      <ViolationSeverityBadge severity={v.severity} />
                    </div>
                    <div className="min-w-0 text-sm">
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
          </Panel>
        </div>
      </div>
    </div>
  );
}
