import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Droplets,
  Refrigerator,
  Thermometer,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { MetricId, MetricStatus, MetricSummary, SafeRange } from "../../model/environment.model";

const METRIC_ICONS: Record<MetricId, LucideIcon> = {
  ambient_temp_c: Thermometer,
  humidity_pct: Droplets,
  fridge_temp_c: Refrigerator,
};

const STATUS: Record<MetricStatus, { className: string; icon: LucideIcon }> = {
  Safe: { className: "bg-emerald-50 text-emerald-700", icon: CircleCheck },
  Warning: { className: "bg-amber-50 text-amber-700", icon: TriangleAlert },
  Critical: { className: "bg-red-50 text-red-700", icon: CircleX },
  "No data": { className: "bg-slate-100 text-slate-500", icon: CircleDashed },
};

function rangeText(range: SafeRange, unit: string): string {
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max} ${unit}`;
  if (range.max !== null) return `≤ ${range.max} ${unit}`;
  return `≥ ${range.min} ${unit}`;
}

interface MetricCardProps {
  metric: MetricSummary;
  stale: boolean;
}

export default function MetricCard({ metric, stale }: MetricCardProps) {
  const Icon = METRIC_ICONS[metric.id];
  const status = STATUS[metric.status];
  const StatusIcon = status.icon;
  const fmt = (v: number) => v.toFixed(metric.decimals);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
          <Icon className="h-6 w-6 text-sky-600" />
        </div>

        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {metric.status}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{metric.name}</p>

      <p
        className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
          stale ? "text-slate-400" : "text-slate-950"
        }`}
      >
        {metric.value === null ? "—" : fmt(metric.value)}
        {metric.value !== null && (
          <span className="ml-1 text-base font-medium text-slate-500">{metric.unit}</span>
        )}
      </p>

      {metric.sensorOk === false && (
        <p className="mt-1 text-xs font-medium text-red-600">
          {metric.sensor.toUpperCase()} sensor reports an error
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-xs">
        {(["min", "avg", "max"] as const).map((k) => (
          <div key={k}>
            <dt className="text-slate-500">24 h {k}</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
              {metric.stats24h ? `${fmt(metric.stats24h[k])} ${metric.unit}` : "—"}
            </dd>
          </div>
        ))}
      </dl>

      {metric.safeRange && (
        <p className="mt-3 text-xs text-slate-500">
          Safe range {rangeText(metric.safeRange, metric.unit)}
        </p>
      )}
    </article>
  );
}
