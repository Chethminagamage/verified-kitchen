import { EnvironmentService } from "../service/environment.service";

const environmentService = new EnvironmentService();

export async function getEnvironmentalMonitoringData() {
  return environmentService.getMonitoringData();
}