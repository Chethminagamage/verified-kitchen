import {
  DEVICE_OFFLINE_AFTER_MS,
  type ConnectionState,
  type DeviceHeartbeat,
  type SystemStatus,
} from "../model/system-status.model";
import { SystemStatusRepository } from "../repository/system-status.repository";

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

export class SystemStatusService {
  constructor(
    private readonly repository = new SystemStatusRepository()
  ) {}

  async getStatus(
    kitchenId: string
  ): Promise<SystemStatus> {
    const [devices, activeViolations] =
      await Promise.all([
        this.repository.getDevices(kitchenId),
        this.repository.countActiveViolations(kitchenId),
      ]);

    const now = Date.now();
    const onlineDevices = devices.filter((device) =>
      isDeviceOnline(device, now)
    ).length;

    return {
      state: connectionState(
        onlineDevices,
        devices.length
      ),
      onlineDevices,
      totalDevices: devices.length,
      activeViolations,
    };
  }
}
