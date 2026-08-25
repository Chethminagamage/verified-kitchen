import {
  Droplets,
  Refrigerator,
  Thermometer,
  CircleCheck,
  TriangleAlert,
  CircleX,
} from "lucide-react";

import type {
  EnvironmentalSensor,
} from "../../model/environment.model";

interface EnvironmentSummaryCardProps {
  sensor: EnvironmentalSensor;
}

function getSensorIcon(type: EnvironmentalSensor["type"]) {
  if (type === "humidity") {
    return Droplets;
  }

  if (type === "refrigerator") {
    return Refrigerator;
  }

  return Thermometer;
}

function getStatusStyle(status: EnvironmentalSensor["status"]) {
  if (status === "Safe") {
    return {
      wrapper: "bg-emerald-50 text-emerald-700",
      Icon: CircleCheck,
    };
  }

  if (status === "Warning") {
    return {
      wrapper: "bg-amber-50 text-amber-700",
      Icon: TriangleAlert,
    };
  }

  return {
    wrapper: "bg-red-50 text-red-700",
    Icon: CircleX,
  };
}

export default function EnvironmentSummaryCard({
  sensor,
}: EnvironmentSummaryCardProps) {
  const SensorIcon = getSensorIcon(sensor.type);
  const statusStyle = getStatusStyle(sensor.status);
  const StatusIcon = statusStyle.Icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
          <SensorIcon className="h-6 w-6 text-sky-600" />
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.wrapper}`}
        >
          <StatusIcon className="h-4 w-4" />
          {sensor.status}
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {sensor.name}
      </p>

      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-bold tracking-tight text-slate-950">
          {sensor.value}
        </span>

        <span className="pb-1 text-sm font-medium text-slate-500">
          {sensor.unit}
        </span>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">
            Sensor
          </span>

          <span className="font-medium text-slate-700">
            {sensor.deviceName}
          </span>
        </div>

        <div className="mt-2 flex justify-between text-xs">
          <span className="text-slate-500">
            Last updated
          </span>

          <span className="font-medium text-slate-700">
            {sensor.lastUpdated}
          </span>
        </div>
      </div>
    </article>
  );
}