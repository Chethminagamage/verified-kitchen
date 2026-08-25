import {
  Droplets,
  Refrigerator,
  Thermometer,
} from "lucide-react";

interface SensorCardProps {
  name: string;
  value: number;
  unit: string;
  status: string;
}

function getSensorIcon(name: string) {
  if (name === "Humidity") {
    return Droplets;
  }

  if (name === "Refrigerator") {
    return Refrigerator;
  }

  return Thermometer;
}

export default function SensorCard({
  name,
  value,
  unit,
  status,
}: SensorCardProps) {
  const Icon = getSensorIcon(name);

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
        <Icon className="h-6 w-6 text-sky-600" />
      </div>

      <div className="flex-1">
        <p className="text-sm text-slate-500">
          {name}
        </p>

        <p className="mt-1 text-xl font-bold text-slate-950">
          {value}
          <span className="ml-1 text-sm font-medium text-slate-500">
            {unit}
          </span>
        </p>
      </div>

      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {status}
      </span>
    </article>
  );
}