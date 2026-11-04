export type ConnectionState =
  | "online"
  | "degraded"
  | "offline";

export interface DeviceHeartbeat {
  id: string;
  name: string;
  type: "env_node" | "camera";
  lastSeenAt: string | null;
}

export interface SystemStatus {
  state: ConnectionState;
  onlineDevices: number;
  totalDevices: number;
  activeViolations: number;
}

/** A device that has not reported within this time is treated as offline. */
export const DEVICE_OFFLINE_AFTER_MS = 2 * 60 * 1000;
