import { connectionState, installedDevices, isDeviceOnline } from "../model/connection";
import { NOTIFICATIONS_SHOWN, type SystemStatus } from "../model/system-status.model";
import { SystemStatusRepository } from "../repository/system-status.repository";

export class SystemStatusService {
  constructor(
    private readonly repository = new SystemStatusRepository()
  ) {}

  async getStatus(
    kitchenId: string
  ): Promise<SystemStatus> {
    const [devices, activeViolations, notifications] =
      await Promise.all([
        this.repository.getDevices(kitchenId),
        this.repository.countActiveViolations(kitchenId),
        this.repository.recentOpenViolations(kitchenId, NOTIFICATIONS_SHOWN),
      ]);

    const now = Date.now();
    const installed = installedDevices(devices);
    const onlineDevices = installed.filter((device) =>
      isDeviceOnline(device, now)
    ).length;

    return {
      state: connectionState(
        onlineDevices,
        installed.length
      ),
      onlineDevices,
      totalDevices: installed.length,
      activeViolations,
      notifications,
      generatedAt: new Date(now).toISOString(),
    };
  }
}
