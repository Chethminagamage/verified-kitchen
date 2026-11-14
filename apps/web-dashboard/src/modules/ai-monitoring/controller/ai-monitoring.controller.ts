import type { KitchenSummary } from "@/modules/auth/model/session.model";

import { AIMonitoringService } from "../service/ai-monitoring.service";

const aiMonitoringService = new AIMonitoringService();

export async function getAIMonitoringPage(kitchen: KitchenSummary) {
  return aiMonitoringService.getPage(kitchen.id, kitchen.timezone);
}
