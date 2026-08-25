"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ViolationBreakdown,
} from "../../model/reports.model";

interface ViolationBreakdownChartProps {
  data: ViolationBreakdown[];
}

export default function ViolationBreakdownChart({
  data,
}: ViolationBreakdownChartProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">
          Violation Distribution
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Recorded violations grouped by hygiene pillar.
        </p>
      </div>

      <div className="mt-6 h-72">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: -15,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="category"
              tick={{
                fontSize: 11,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              allowDecimals={false}
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip />

            <Bar
              dataKey="count"
              fill="#64748b"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}