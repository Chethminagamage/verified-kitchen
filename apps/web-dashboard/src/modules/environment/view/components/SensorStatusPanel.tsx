import {
  CircleCheck,
  Cpu,
  Wifi,
} from "lucide-react";

import type {
  EnvironmentalSensor,
} from "../../model/environment.model";

interface SensorStatusPanelProps {
  sensors: EnvironmentalSensor[];
}

export default function SensorStatusPanel({
  sensors,
}: SensorStatusPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Cpu className="h-5 w-5 text-slate-700" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Sensor Status
          </h3>

          <p className="text-sm text-slate-500">
            Environmental monitoring devices
          </p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-slate-100">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="flex items-center justify-between py-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-900">
                {sensor.deviceName}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {sensor.name}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CircleCheck className="h-4 w-4" />
              Online
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
        <Wifi className="h-4 w-4" />
        Environmental monitoring connected
      </div>
    </section>
  );
}