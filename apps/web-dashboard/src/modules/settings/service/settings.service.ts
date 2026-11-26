import { AccountService } from "@/modules/account/service/account.service";
import { ROLE_LABELS, type OperatorSession } from "@/modules/auth/model/session.model";
import { isDeviceOnline } from "@/modules/system-status/model/connection";
import { formatDateTime } from "@/shared/utils/time";

import type { SettingsData } from "../model/settings.model";
import { SettingsRepository, type DeviceRow } from "../repository/settings.repository";

/** A device is running when it reported recently and has not announced that it went offline. */
function isRunning(row: DeviceRow | undefined, now: number): boolean {
  if (!row) return false;
  const status = row.last_status;
  const reportedOffline =
    typeof status === "object" && status !== null && !Array.isArray(status) && status.state === "offline";
  return !reportedOffline && isDeviceOnline({ ...row, lastSeenAt: row.last_seen_at }, now);
}

export class SettingsService {
  constructor(
    private readonly repository = new SettingsRepository(),
    private readonly accountService = new AccountService(),
  ) {}

  async getSettingsData(session: OperatorSession, now = new Date()): Promise<SettingsData> {
    const kitchen = session.kitchen;
    if (!kitchen) {
      throw new Error("Settings require a kitchen");
    }

    const [devices, lastReading, phone] = await Promise.all([
      this.repository.devices(kitchen.id),
      this.repository.latestReadingAt(kitchen.id),
      this.accountService.phone(session),
    ]);
    const t = now.getTime();

    return {
      kitchenProfile: {
        kitchenId: kitchen.code,
        kitchenName: kitchen.name,
        location: kitchen.location ?? "—",
        operatorName: session.fullName ?? session.email,
      },
      // Reflects what is actually running, not a stored preference.
      monitoring: {
        cameraOnline: isRunning(devices.find((d) => d.type === "camera"), t),
        sensorsOnline: isRunning(devices.find((d) => d.type === "env_node"), t),
        lastReadingLabel: lastReading ? formatDateTime(lastReading, kitchen.timezone) : null,
      },
      account: {
        fullName: session.fullName,
        email: session.email,
        phone,
        roleLabel: ROLE_LABELS[session.role],
        signedInLabel: session.signedInAt
          ? formatDateTime(new Date(session.signedInAt).toISOString(), kitchen.timezone)
          : "—",
      },
    };
  }
}
