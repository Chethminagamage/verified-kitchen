import { connectionState, isDeviceOnline } from "../model/connection";
import type { SystemStatus } from "../model/system-status.model";
import { SystemStatusRepository } from "../repository/system-status.repository";

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
