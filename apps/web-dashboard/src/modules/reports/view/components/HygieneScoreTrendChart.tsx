"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { ChartTooltipCard, SeriesRow } from "@/shared/components/charts/ChartTooltipCard";
import {
  ACTIVE_DOT,
  AXIS_TICK,
  CHART_MARGIN,
  CURSOR,
  GRID_STROKE,
  LINE_WIDTH,
  SINGLE_SERIES_COLOR,
} from "@/shared/components/charts/chart-theme";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";

import type { HygieneTrendPoint } from "../../model/reports.model";

function TrendTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <ChartTooltipCard title={label}>
      <SeriesRow
        color={SINGLE_SERIES_COLOR}
        label="Hygiene score"
        value={typeof value === "number" ? `${value}/100` : "No data"}
      />
    </ChartTooltipCard>
  );
}

/** A point with no neighbours would be invisible without a dot; only those get one. */
function isolatedDot(data: HygieneTrendPoint[]) {
  return function Dot(props: { cx?: number; cy?: number; index?: number }) {
    const { cx, cy, index = 0 } = props;
    const alone = data[index]?.score !== null && data[index - 1]?.score == null && data[index + 1]?.score == null;
    if (!alone || cx === undefined || cy === undefined) return <g key={index} />;
    return <circle key={index} cx={cx} cy={cy} r={4} fill={SINGLE_SERIES_COLOR} stroke="#ffffff" strokeWidth={2} />;
  };
}

export default function HygieneScoreTrendChart({ data }: { data: HygieneTrendPoint[] }) {
  const hasData = data.some((d) => d.score !== null);

  return (
    <Panel>
      <PanelHeader
        title="Hygiene score trend"
        description="Overall hygiene score, 6-hour averages. Gaps mean nothing was monitored."
      />

      {hasData ? (
        <>
          <div className="mt-6 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={CHART_MARGIN}>
                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip cursor={CURSOR} content={<TrendTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Hygiene score"
                  stroke={SINGLE_SERIES_COLOR}
                  strokeWidth={LINE_WIDTH}
                  strokeLinecap="round"
                  dot={isolatedDot(data)}
                  activeDot={ACTIVE_DOT}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Show data table</summary>
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-4 font-medium">Period</th>
                    <th className="py-1.5 text-right font-medium">Hygiene score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums text-slate-700">
                  {data.map((d) => (
                    <tr key={d.date}>
                      <td className="py-1.5 pr-4">{d.date}</td>
                      <td className="py-1.5 text-right">{d.score === null ? "—" : d.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <EmptyState icon={LineChartIcon} title="No scores in this period" className="mt-4">
          The trend appears once the camera and sensors have been running.
        </EmptyState>
      )}
    </Panel>
  );
}
