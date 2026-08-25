import { EnvironmentRepository } from "../repository/environment.repository";

export class EnvironmentService {
  constructor(
    private readonly environmentRepository =
      new EnvironmentRepository()
  ) {}

  async getMonitoringData() {
    return this.environmentRepository.getEnvironmentalMonitoringData();
  }
}