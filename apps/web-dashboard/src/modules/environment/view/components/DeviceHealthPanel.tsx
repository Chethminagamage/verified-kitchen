import { RadioTower, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { formatDateTime } from "@/shared/utils/time";

import { signalQuality, type DeviceHealth } from "../../model/environment.model";

const SENSOR_LABELS: Record<string, string> = {
  bme280: "Air sensor",
  ds18b20: "Fridge probe",
};

const TIME_SOURCE_LABELS: Record<string, string> = {
  ntp: "Correct",
  rtc: "Correct",
  edge: "Correct",
  none: "Not set",
};

interface DeviceHealthPanelProps {
  device: DeviceHealth | null;
  timezone: string;
  generatedAt: string;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function SensorState({ state, online }: { state: string | undefined; online: boolean }) {
  // While the sensors are offline their current state is unknown; show the last one received.
  if (!online) {
    return <span className="text-slate-400">Unknown{state ? ` (last: ${state === "ok" ? "OK" : "Error"})` : ""}</span>;
  }
  if (state === "ok") return <StatusPill tone="positive">OK</StatusPill>;
  if (state === "error") return <StatusPill tone="critical">Error</StatusPill>;
  return <span className="text-slate-400">Unknown</span>;
}

/** Health of the kitchen's sensors: connection, each sensor, Wi-Fi, clock and unsent readings. */
export default function DeviceHealthPanel({ device, timezone, generatedAt }: DeviceHealthPanelProps) {
  if (!device) {
    return (
      <Panel>
        <EmptyState icon={RadioTower} title="No sensors set up" compact>
          The platform administrator registers this kitchen&apos;s sensors.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        icon={RadioTower}
        tone={device.online ? "info" : "neutral"}
        title="Kitchen sensors"
        description="Kitchen air and refrigerator temperature"
        aside={
          <StatusPill tone={device.online ? "positive" : "neutral"} icon={device.online ? Wifi : WifiOff}>
            {device.online ? "Online" : "Offline"}
          </StatusPill>
        }
      />

      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <Row label="Last reading">
          {device.lastSeenAt ? (
            <>
              <LiveAge iso={device.lastSeenAt} serverNow={generatedAt} />
              <span className="ml-1 text-xs font-normal text-slate-500">({formatDateTime(device.lastSeenAt, timezone)})</span>
            </>
          ) : (
            "Never"
          )}
        </Row>
        {Object.keys(SENSOR_LABELS).map((sensor) => (
          <Row key={sensor} label={SENSOR_LABELS[sensor]}>
            <SensorState state={device.sensors[sensor]} online={device.online} />
          </Row>
        ))}
        <Row label="Wi-Fi signal">{device.rssi === null || !device.online ? "—" : signalQuality(device.rssi)}</Row>
        <Row label="Clock">{device.timeSource ? (TIME_SOURCE_LABELS[device.timeSource] ?? "—") : "—"}</Row>
        <Row label="Readings waiting to upload">
          {device.buffered === null ? "—" : device.buffered === 0 ? "None" : device.buffered}
        </Row>
      </dl>
    </Panel>
  );
}
