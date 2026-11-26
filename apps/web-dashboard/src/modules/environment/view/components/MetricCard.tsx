import { Droplets, Refrigerator, Thermometer, WifiOff, type LucideIcon } from "lucide-react";

import AnimatedNumber from "@/shared/components/ui/AnimatedNumber";
import { IconTile, Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForStatus } from "@/shared/components/ui/tone";

import type { MetricId, MetricSummary, SafeRange } from "../../model/environment.model";

const METRIC_ICONS: Record<MetricId, LucideIcon> = {
  ambient_temp_c: Thermometer,
  humidity_pct: Droplets,
  fridge_temp_c: Refrigerator,
};

function rangeText(range: SafeRange, unit: string): string {
  if (range.min !== null && range.max !== null) return `${range.min}–${range.max} ${unit}`;
  if (range.max !== null) return `≤ ${range.max} ${unit}`;
  return `≥ ${range.min} ${unit}`;
}

interface MetricCardProps {
  metric: MetricSummary;
  /** The values are the last ones received (no new reading is arriving). */
  stale: boolean;
}

/** Live value of one environmental measurement with its 24-hour range. */
export default function MetricCard({ metric, stale }: MetricCardProps) {
  const fmt = (v: number) => v.toFixed(metric.decimals);

  return (
    <Panel as="article" interactive>
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={METRIC_ICONS[metric.id]} tone="info" size="lg" />
        <StatusPill tone={toneForStatus(metric.status)} icon={metric.status === "Offline" ? WifiOff : undefined}>
          {metric.status}
        </StatusPill>
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{metric.name}</p>

      {metric.value === null ? (
        <p className="mt-2 text-sm text-slate-500">No reading right now.</p>
      ) : (
        <p className="mt-1 flex items-baseline gap-1">
          <AnimatedNumber
            value={metric.value}
            decimals={metric.decimals}
            className={`text-3xl font-semibold tracking-tight ${stale ? "text-slate-400" : "text-slate-950"}`}
          />
          <span className="text-base font-medium text-slate-500">{metric.unit}</span>
        </p>
      )}

      {metric.sensorOk === false && !stale && (
        <p className="mt-1 text-xs font-medium text-red-600">The sensor reports an error.</p>
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
        <p className="mt-3 text-xs text-slate-500">Safe range {rangeText(metric.safeRange, metric.unit)}</p>
      )}
    </Panel>
  );
}
