import {
  Droplets,
  Refrigerator,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

import type {
  MetricId,
  MetricStatus,
  SensorSummary,
} from "../../model/dashboard.model";

const SENSOR_ICONS: Record<MetricId, LucideIcon> = {
  ambient_temp_c: Thermometer,
  humidity_pct: Droplets,
  fridge_temp_c: Refrigerator,
};

const STATUS_STYLES: Record<MetricStatus, string> = {
  Safe: "bg-emerald-50 text-emerald-700",
  Warning: "bg-amber-50 text-amber-700",
  Critical: "bg-red-50 text-red-700",
  "No data": "bg-slate-100 text-slate-500",
};

interface SensorCardProps {
  sensor: SensorSummary;
}

export default function SensorCard({
  sensor,
}: SensorCardProps) {
  const Icon = SENSOR_ICONS[sensor.id];

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
        <Icon className="h-6 w-6 text-sky-600" />
      </div>

      <div className="flex-1">
        <p className="text-sm text-slate-500">
          {sensor.name}
        </p>

        <p className="mt-1 text-xl font-bold text-slate-950">
          {sensor.value === null ? "—" : sensor.value.toFixed(1)}
          {sensor.value !== null && (
            <span className="ml-1 text-sm font-medium text-slate-500">
              {sensor.unit}
            </span>
          )}
        </p>
      </div>

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[sensor.status]}`}
      >
        {sensor.status}
      </span>
    </article>
  );
}
