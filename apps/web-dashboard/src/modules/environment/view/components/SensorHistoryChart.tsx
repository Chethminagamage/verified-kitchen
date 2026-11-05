"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatClock, formatDateTime } from "@/shared/utils/time";

import type { ChartPoint, MetricSummary, RangeId } from "../../model/environment.model";

const LINE = "#2a78d6"; // categorical slot 1 (single series per chart)
const SAFE_FILL = "#10b981";
const AXIS_TEXT = { fontSize: 12, fill: "#64748b" };

interface Datum extends ChartPoint {
  band: [number, number] | null;
}

function yDomain(points: ChartPoint[], metric: MetricSummary): [number, number] {
  const values = points.flatMap((p) => [p.min, p.max]).filter((v): v is number => v !== null);
  const bounds = [...values];
  if (metric.safeRange?.min != null) bounds.push(metric.safeRange.min);
  if (metric.safeRange?.max != null) bounds.push(metric.safeRange.max);
  if (bounds.length === 0) return [0, 1];
  const lo = Math.min(...bounds);
  const hi = Math.max(...bounds);
  const pad = Math.max((hi - lo) * 0.1, 0.5);
  return [Math.floor(lo - pad), Math.ceil(hi + pad)];
}

function HistoryTooltip({
  active,
  payload,
  metric,
  timezone,
  raw,
}: Partial<TooltipContentProps<number, string>> & { metric: MetricSummary; timezone: string; raw: boolean }) {
  const d = payload?.[0]?.payload as Datum | undefined;
  if (!active || !d) return null;
  const f = (v: number) => `${v.toFixed(metric.decimals + (raw ? 1 : 0))} ${metric.unit}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-slate-900">{formatDateTime(d.t, timezone)}</p>
      {d.avg === null ? (
        <p className="mt-1 text-slate-500">No reading (sensor error or offline)</p>
      ) : raw ? (
        <p className="mt-1 font-semibold tabular-nums text-slate-900">{f(d.avg)}</p>
      ) : (
        <p className="mt-1 tabular-nums text-slate-600">
          <span className="font-semibold text-slate-900">{f(d.avg)}</span> average
          {d.min !== null && d.max !== null && ` · ${f(d.min)} – ${f(d.max)}`}
        </p>
      )}
    </div>
  );
}

interface SensorHistoryChartProps {
  metric: MetricSummary;
  range: RangeId;
  timezone: string;
}

export default function SensorHistoryChart({ metric, range, timezone }: SensorHistoryChartProps) {
  const raw = range === "1h";
  const data: Datum[] = metric.points.map((p) => ({
    ...p,
    band: p.min !== null && p.max !== null ? [p.min, p.max] : null,
  }));
  const hasData = data.some((d) => d.avg !== null);
  const [lo, hi] = yDomain(metric.points, metric);
  const safe = metric.safeRange;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-950">
          {metric.name} <span className="font-normal text-slate-500">({metric.unit})</span>
        </h3>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: LINE }} />
            {raw ? "Reading" : "Average"}
          </li>
          {!raw && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: LINE, opacity: 0.15 }} />
              Min–max
            </li>
          )}
          {safe && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-4 rounded-sm" style={{ backgroundColor: SAFE_FILL, opacity: 0.15 }} />
              Safe range
            </li>
          )}
        </ul>
      </div>

      {hasData ? (
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />

              {safe && (
                <ReferenceArea
                  y1={safe.min ?? lo}
                  y2={safe.max ?? hi}
                  fill={SAFE_FILL}
                  fillOpacity={0.08}
                  stroke="none"
                  ifOverflow="hidden"
                />
              )}

              <XAxis
                dataKey="t"
                tickFormatter={(iso: string) =>
                  range === "7d" ? formatDateTime(iso, timezone).split(" ").slice(0, 2).join(" ") : formatClock(iso, timezone)
                }
                tick={AXIS_TEXT}
                tickLine={false}
                axisLine={false}
                minTickGap={32}
              />
              <YAxis domain={[lo, hi]} tick={AXIS_TEXT} tickLine={false} axisLine={false} allowDecimals={false} />

              <Tooltip
                cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                content={<HistoryTooltip metric={metric} timezone={timezone} raw={raw} />}
              />

              {!raw && (
                <Area
                  dataKey="band"
                  stroke="none"
                  fill={LINE}
                  fillOpacity={0.12}
                  connectNulls={false}
                  isAnimationActive={false}
                  activeDot={false}
                />
              )}
              <Line
                dataKey="avg"
                stroke={LINE}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-400">No readings in this period.</p>
        </div>
      )}
    </section>
  );
}
