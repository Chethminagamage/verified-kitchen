import { AIMonitoringRepository } from "../repository/ai-monitoring.repository";

export class AIMonitoringService {
  constructor(
    private readonly aiMonitoringRepository =
      new AIMonitoringRepository()
  ) {}

  async getMonitoringData() {
    return this.aiMonitoringRepository.getMonitoringData();
  }
}