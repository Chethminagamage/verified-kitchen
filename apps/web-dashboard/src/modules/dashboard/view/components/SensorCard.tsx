import { Droplets, Refrigerator, Thermometer, WifiOff, type LucideIcon } from "lucide-react";

import AnimatedNumber from "@/shared/components/ui/AnimatedNumber";
import { IconTile, Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForStatus } from "@/shared/components/ui/tone";

import type { MetricId, SensorSummary } from "../../model/dashboard.model";

const SENSOR_ICONS: Record<MetricId, LucideIcon> = {
  ambient_temp_c: Thermometer,
  humidity_pct: Droplets,
  fridge_temp_c: Refrigerator,
};

export default function SensorCard({ sensor }: { sensor: SensorSummary }) {
  const tone = toneForStatus(sensor.status);
  const offline = sensor.status === "Offline";

  return (
    <Panel as="article" interactive className="flex items-center gap-4">
      <IconTile icon={SENSOR_ICONS[sensor.id]} tone="info" size="lg" />

      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-500">{sensor.name}</p>
        {sensor.value === null ? (
          <p className="mt-1 text-sm text-slate-400">No reading</p>
        ) : (
          <p className="mt-0.5 flex items-baseline gap-1">
            <AnimatedNumber
              value={sensor.value}
              decimals={1}
              className={`text-xl font-semibold tracking-tight ${offline ? "text-slate-400" : "text-slate-950"}`}
            />
            <span className="text-sm font-medium text-slate-500">{sensor.unit}</span>
          </p>
        )}
      </div>

      <StatusPill tone={tone} icon={offline ? WifiOff : undefined}>
        {sensor.status}
      </StatusPill>
    </Panel>
  );
}
