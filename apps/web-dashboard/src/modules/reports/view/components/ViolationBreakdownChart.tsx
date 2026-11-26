"use client";

import { ShieldCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { ChartTooltipCard, SeriesRow } from "@/shared/components/charts/ChartTooltipCard";
import { AXIS_TICK, BAR_CURSOR, BAR_RADIUS, CHART_MARGIN, GRID_STROKE, SERIES_COLORS } from "@/shared/components/charts/chart-theme";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";

import type { ViolationBreakdown } from "../../model/reports.model";

function BreakdownTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const row = payload?.[0]?.payload as ViolationBreakdown | undefined;
  if (!active || !row) return null;
  return (
    <ChartTooltipCard title={row.category}>
      <SeriesRow color={SERIES_COLORS[row.pillarId]} label="Violations" value={row.count} />
    </ChartTooltipCard>
  );
}

/** Violations per pillar, in each pillar's colour, with the count on each bar. */
export default function ViolationBreakdownChart({ data }: { data: ViolationBreakdown[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Panel>
      <PanelHeader title="Violations by pillar" description="Problems recorded during the period, grouped by hygiene pillar." />

      {total > 0 ? (
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ ...CHART_MARGIN, top: 20 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={GRID_STROKE} />
              <XAxis dataKey="category" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <Tooltip cursor={BAR_CURSOR} content={<BreakdownTooltip />} />
              <Bar dataKey="count" radius={BAR_RADIUS} maxBarSize={64} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.pillarId} fill={SERIES_COLORS[d.pillarId]} />
                ))}
                <LabelList dataKey="count" position="top" className="fill-slate-700 text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState icon={ShieldCheck} tone="positive" title="No violations in this period" className="mt-4">
          Nothing was recorded against any hygiene pillar.
        </EmptyState>
      )}
    </Panel>
  );
}
