import type { OperatorSession } from "@/modules/auth/model/session.model";
import { isDeviceOnline } from "@/modules/system-status/model/connection";
import type { Json } from "@/shared/types/database.types";
import { formatDateTime } from "@/shared/utils/time";

import packageJson from "../../../../package.json";
import type { SettingsData } from "../model/settings.model";
import { SettingsRepository, type DeviceRow } from "../repository/settings.repository";

function status(row: DeviceRow): Record<string, Json | undefined> {
  const s = row.last_status;
  return typeof s === "object" && s !== null && !Array.isArray(s) ? s : {};
}

function describeNode(row: DeviceRow | undefined, now: number): string {
  if (!row) return "Not registered";
  const s = status(row);
  const online = s.state !== "offline" && isDeviceOnline({ ...row, lastSeenAt: row.last_seen_at }, now);
  const fw = typeof s.fw === "string" ? ` · firmware ${s.fw}` : "";
  return `${row.id} (ESP32: BME280 + DS18B20)${fw} · ${online ? "Online" : "Offline"}`;
}

function describeCamera(row: DeviceRow | undefined, now: number): string {
  const online = row ? isDeviceOnline({ ...row, lastSeenAt: row.last_seen_at }, now) : false;
  if (!online) return "YOLOv8n (planned) · camera not connected yet";
  const model = status(row as DeviceRow).model_version;
  return `${typeof model === "string" ? model : "unknown model"} · ${row?.id} online`;
}

export class SettingsService {
  constructor(private readonly repository = new SettingsRepository()) {}

  async getSettingsData(session: OperatorSession, now = new Date()): Promise<SettingsData> {
    const kitchen = session.kitchen;
    if (!kitchen) {
      throw new Error("Settings require a kitchen");
    }

    const [devices, lastReading, pending, configVersion] = await Promise.all([
      this.repository.devices(kitchen.id),
      this.repository.latestReadingAt(kitchen.id),
      this.repository.pendingAuditRecords(kitchen.id),
      this.repository.activeConfigVersion(),
    ]);
    const t = now.getTime();

    return {
      kitchenProfile: {
        kitchenId: kitchen.code,
        kitchenName: kitchen.name,
        location: kitchen.location ?? "—",
        operatorName: session.fullName ?? session.email,
      },
      // Monitoring and notification preferences are not stored yet (UI only).
      monitoring: {
        aiMonitoringEnabled: true,
        environmentalMonitoringEnabled: true,
        auditLoggingEnabled: true,
        scoreRefreshInterval: `Live · scoring config ${configVersion ?? "—"}`,
        privacyMode: "Edge processing; no video stored",
      },
      notifications: {
        violationAlerts: true,
        criticalAlerts: true,
        sensorWarnings: true,
        dailySummary: false,
      },
      system: {
        applicationVersion: `${packageJson.version} (prototype)`,
        aiModel: describeCamera(devices.find((d) => d.type === "camera"), t),
        edgeDevice: "MacBook Air M1 · edge service + Mosquitto MQTT broker",
        sensorNode: describeNode(devices.find((d) => d.type === "env_node"), t),
        database: "PostgreSQL (Supabase) · Row Level Security",
        blockchainPlatform: `Hyperledger Fabric · not connected yet (${pending} audit record${pending === 1 ? "" : "s"} waiting to be anchored)`,
        lastSync: lastReading
          ? `Latest sensor reading ${formatDateTime(lastReading, kitchen.timezone)}`
          : "No sensor readings yet",
      },
    };
  }
}
