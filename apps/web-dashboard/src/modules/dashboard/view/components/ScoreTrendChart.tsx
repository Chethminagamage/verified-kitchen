"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { formatClock, formatDateTime } from "@/shared/utils/time";

import type { TrendPoint } from "../../model/dashboard.model";

type SeriesKey = "overall" | "personal" | "foodPrep" | "environmental";

// Categorical palette in fixed order (validated set: blue, orange, aqua, yellow).
const SERIES: ReadonlyArray<{ key: SeriesKey; label: string; color: string }> = [
  { key: "overall", label: "Overall", color: "#2a78d6" },
  { key: "personal", label: "Personal", color: "#eb6834" },
  { key: "foodPrep", label: "Food preparation", color: "#1baf7a" },
  { key: "environmental", label: "Environment", color: "#eda100" },
];

const AXIS_TEXT = { fontSize: 12, fill: "#64748b" };

function LineKey({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-0.5 w-4 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function fmt(value: number | null | undefined): string {
  return typeof value === "number" ? value.toFixed(1) : "—";
}

function TrendTooltip({
  active,
  payload,
  timezone,
}: Partial<TooltipContentProps<number, string>> & { timezone: string }) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;

  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1.5 font-medium text-slate-900">
        {formatDateTime(point.bucket, timezone)} (hourly average)
      </p>

      <ul className="space-y-1">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-slate-600">
            <LineKey color={s.color} />
            <span className="flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {fmt(point[s.key])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ScoreTrendChartProps {
  data: TrendPoint[];
  timezone: string;
}

export default function ScoreTrendChart({
  data,
  timezone,
}: ScoreTrendChartProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Hygiene Score Trend
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Hourly averages over the last 24 hours.
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <LineKey color={s.color} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      {data.length === 0 ? (
        <div className="mt-6 flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
          <p className="text-sm text-slate-400">
            No scores in the last 24 hours.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" />

                <XAxis
                  dataKey="bucket"
                  tickFormatter={(iso: string) => formatClock(iso, timezone)}
                  tick={AXIS_TEXT}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={AXIS_TEXT}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  content={<TrendTooltip timezone={timezone} />}
                />

                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 4, stroke: "#ffffff", strokeWidth: 2 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
              Show data table
            </summary>

            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Hour</th>
                    {SERIES.map((s) => (
                      <th key={s.key} className="py-1.5 pr-4 text-right font-medium">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 tabular-nums text-slate-700">
                  {data.map((point) => (
                    <tr key={point.bucket}>
                      <td className="py-1.5 pr-4">{formatDateTime(point.bucket, timezone)}</td>
                      {SERIES.map((s) => (
                        <td key={s.key} className="py-1.5 pr-4 text-right">
                          {fmt(point[s.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
