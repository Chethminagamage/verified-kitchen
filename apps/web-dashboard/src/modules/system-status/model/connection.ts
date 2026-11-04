import {
  DEVICE_OFFLINE_AFTER_MS,
  type ConnectionState,
  type DeviceHeartbeat,
} from "./system-status.model";

export function isDeviceOnline(
  device: DeviceHeartbeat,
  now: number
): boolean {
  if (!device.lastSeenAt) {
    return false;
  }

  return (
    now - new Date(device.lastSeenAt).getTime() <=
    DEVICE_OFFLINE_AFTER_MS
  );
}

export function connectionState(
  online: number,
  total: number
): ConnectionState {
  if (total > 0 && online === total) {
    return "online";
  }

  return online > 0 ? "degraded" : "offline";
}
