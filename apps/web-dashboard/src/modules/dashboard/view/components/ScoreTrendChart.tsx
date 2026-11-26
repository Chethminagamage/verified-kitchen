"use client";

import { LineChart as LineChartIcon } from "lucide-react";
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

import { ChartTooltipCard, SeriesKey as LineKey, SeriesRow } from "@/shared/components/charts/ChartTooltipCard";
import {
  ACTIVE_DOT,
  AXIS_TICK,
  CHART_MARGIN,
  CURSOR,
  GRID_STROKE,
  LINE_WIDTH,
  SERIES_COLORS,
} from "@/shared/components/charts/chart-theme";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import { formatClock, formatDateTime } from "@/shared/utils/time";

import type { TrendPoint } from "../../model/dashboard.model";

type SeriesKey = "overall" | "personal" | "foodPrep" | "environmental";

// Shared categorical colours (chart-theme.ts): each pillar has the same colour on every chart.
const SERIES: ReadonlyArray<{ key: SeriesKey; label: string; color: string }> = [
  { key: "overall", label: "Overall", color: SERIES_COLORS.overall },
  { key: "personal", label: "Personal", color: SERIES_COLORS.personal },
  { key: "foodPrep", label: "Food preparation", color: SERIES_COLORS.food_prep },
  { key: "environmental", label: "Environment", color: SERIES_COLORS.environmental },
];

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
    <ChartTooltipCard title={`${formatDateTime(point.bucket, timezone)} (hourly average)`}>
      <div className="space-y-1">
        {SERIES.map((s) => (
          <SeriesRow key={s.key} color={s.color} label={s.label} value={fmt(point[s.key])} />
        ))}
      </div>
    </ChartTooltipCard>
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
    <Panel>
      <PanelHeader
        title="Hygiene score trend"
        description="Hourly averages over the last 24 hours."
        aside={
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {SERIES.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <LineKey color={s.color} />
                {s.label}
              </li>
            ))}
          </ul>
        }
      />

      {data.length === 0 ? (
        <EmptyState icon={LineChartIcon} title="No scores in the last 24 hours" className="mt-4">
          The trend appears once the camera and sensors have been running for a while.
        </EmptyState>
      ) : (
        <>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={CHART_MARGIN}
              >
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />

                <XAxis
                  dataKey="bucket"
                  tickFormatter={(iso: string) => formatClock(iso, timezone)}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />

                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  cursor={CURSOR}
                  content={<TrendTooltip timezone={timezone} />}
                />

                {SERIES.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={LINE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={ACTIVE_DOT}
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
    </Panel>
  );
}
