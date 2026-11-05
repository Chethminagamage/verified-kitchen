import { Cpu, Wifi, WifiOff } from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";
import { formatDateTime } from "@/shared/utils/time";

import { formatUptime, signalQuality, type DeviceHealth } from "../../model/environment.model";

const SENSOR_LABELS: Record<string, string> = {
  bme280: "BME280 (air)",
  ds18b20: "DS18B20 (fridge)",
};

const TIME_SOURCE_LABELS: Record<string, string> = {
  ntp: "Internet time (NTP)",
  rtc: "Real-time clock",
  none: "Not synchronised",
  edge: "Edge computer",
};

interface DeviceHealthPanelProps {
  device: DeviceHealth | null;
  timezone: string;
  generatedAt: string;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

export default function DeviceHealthPanel({ device, timezone, generatedAt }: DeviceHealthPanelProps) {
  if (!device) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-950">Sensor Node</h3>
        <p className="mt-2 text-sm text-slate-500">No environmental node is registered for this kitchen.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Cpu className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">Sensor Node</h3>
            <p className="text-xs text-slate-500">
              {device.name} · {device.id}
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            device.online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {device.online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {device.online ? "Online" : "Offline"}
        </span>
      </div>

      <dl className="mt-4 divide-y divide-slate-100 text-sm">
        <Row label="Last message">
          {device.lastSeenAt ? (
            <>
              <LiveAge iso={device.lastSeenAt} serverNow={generatedAt} />
              <span className="ml-1 text-xs font-normal text-slate-500">
                ({formatDateTime(device.lastSeenAt, timezone)})
              </span>
            </>
          ) : (
            "Never"
          )}
        </Row>

        {Object.keys(SENSOR_LABELS).map((sensor) => {
          const state = device.sensors[sensor];
          return (
            <Row key={sensor} label={SENSOR_LABELS[sensor]}>
              <span
                className={
                  state === "ok" ? "text-emerald-700" : state === "error" ? "text-red-700" : "text-slate-400"
                }
              >
                {state === "ok" ? "OK" : state === "error" ? "Error" : "Unknown"}
              </span>
            </Row>
          );
        })}

        <Row label="Wi-Fi signal">
          {device.rssi === null ? "—" : `${signalQuality(device.rssi)} (${device.rssi} dBm)`}
        </Row>
        <Row label="Clock">{device.timeSource ? (TIME_SOURCE_LABELS[device.timeSource] ?? device.timeSource) : "—"}</Row>
        <Row label="Waiting to send">{device.buffered === null ? "—" : `${device.buffered} reading(s)`}</Row>
        <Row label="Uptime">{device.uptimeS === null ? "—" : formatUptime(device.uptimeS)}</Row>
        <Row label="Firmware">{device.firmware ?? "—"}</Row>
        <Row label="Last restart">{device.resetReason ?? "—"}</Row>
      </dl>
    </section>
  );
}
