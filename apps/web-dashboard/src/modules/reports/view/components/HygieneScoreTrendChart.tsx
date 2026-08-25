"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  HygieneTrendPoint,
} from "../../model/reports.model";

interface HygieneScoreTrendChartProps {
  data: HygieneTrendPoint[];
}

export default function HygieneScoreTrendChart({
  data,
}: HygieneScoreTrendChartProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">
          Hygiene Score Trend
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Historical overall hygiene score.
        </p>
      </div>

      <div className="mt-6 h-72 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 15,
              left: -15,
              bottom: 0,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e2e8f0"
            />

            <XAxis
              dataKey="date"
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              domain={[0, 100]}
              tick={{
                fontSize: 12,
                fill: "#64748b",
              }}
              tickLine={false}
              axisLine={false}
            />

            <Tooltip
              formatter={(value) => [
                `${value}/100`,
                "Hygiene Score",
              ]}
              contentStyle={{
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            />

            <Line
              type="monotone"
              dataKey="score"
              stroke="#10b981"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#10b981",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}