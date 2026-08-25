import { SettingsService } from "../service/settings.service";

const settingsService = new SettingsService();

export async function getSettingsData() {
  return settingsService.getSettingsData();
}