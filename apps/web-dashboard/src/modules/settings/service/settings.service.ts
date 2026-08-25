import { SettingsRepository } from "../repository/settings.repository";

export class SettingsService {
  constructor(
    private readonly settingsRepository =
      new SettingsRepository()
  ) {}

  async getSettingsData() {
    return this.settingsRepository.getSettingsData();
  }
}