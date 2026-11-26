"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { ChartTooltipCard, SeriesRow } from "@/shared/components/charts/ChartTooltipCard";
import { AXIS_TICK, BAR_CURSOR, BAR_RADIUS, CHART_MARGIN, GRID_STROKE, SERIES_COLORS } from "@/shared/components/charts/chart-theme";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";

import type { PillarPerformance } from "../../model/reports.model";

function PillarTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const row = payload?.[0]?.payload as PillarPerformance | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard title={row.pillar}>
      <SeriesRow
        color={SERIES_COLORS[row.pillarId]}
        label="Average score"
        value={row.averageScore === null ? "No evidence" : `${row.averageScore}%`}
      />
    </ChartTooltipCard>
  );
}

/** Average score per pillar. Each pillar keeps its colour from the trend chart; values are labelled on the bars. */
export default function PillarPerformanceChart({ data }: { data: PillarPerformance[] }) {
  const hasData = data.some((d) => d.averageScore !== null);

  return (
    <Panel>
      <PanelHeader
        title="Pillar performance"
        description="Average pillar scores over the period. A pillar without evidence has no bar."
      />

      {hasData ? (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ ...CHART_MARGIN, top: 20 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="pillar" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip cursor={BAR_CURSOR} content={<PillarTooltip />} />
              <Bar dataKey="averageScore" radius={BAR_RADIUS} maxBarSize={64} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.pillarId} fill={SERIES_COLORS[d.pillarId]} />
                ))}
                <LabelList
                  dataKey="averageScore"
                  position="top"
                  formatter={(v: unknown) => (typeof v === "number" ? `${v}%` : "")}
                  className="fill-slate-700 text-xs font-semibold"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={BarChart3} title="No pillar scores in this period" className="mt-4">
          Pillar averages appear once monitoring has run during the period.
        </EmptyState>
      )}
    </Panel>
  );
}
