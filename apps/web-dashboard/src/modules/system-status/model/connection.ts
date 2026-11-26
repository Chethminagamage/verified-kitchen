import {
  DEVICE_OFFLINE_AFTER_MS,
  type ConnectionState,
  type DeviceHeartbeat,
} from "./system-status.model";

export function isDeviceOnline(
  device: DeviceHeartbeat,
  now: number
): boolean {
  if (!device.lastSeenAt || device.reportedOffline) {
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

/**
 * Devices that have reported at least once. A device that has never sent
 * anything (e.g. a camera not installed yet) is "not installed", not "offline",
 * and must not make the system look degraded.
 */
export function installedDevices<T extends DeviceHeartbeat>(devices: T[]): T[] {
  return devices.filter((d) => d.lastSeenAt !== null);
}
