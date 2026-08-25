import { AIMonitoringService } from "../service/ai-monitoring.service";

const aiMonitoringService = new AIMonitoringService();

export async function getAIMonitoringData() {
  return aiMonitoringService.getMonitoringData();
}