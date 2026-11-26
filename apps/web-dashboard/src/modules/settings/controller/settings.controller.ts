import type { OperatorSession } from "@/modules/auth/model/session.model";

import { SettingsService } from "../service/settings.service";

const settingsService = new SettingsService();

export async function getSettingsData(session: OperatorSession) {
  return settingsService.getSettingsData(session);
}
