import type { KitchenSummary } from "@/modules/auth/model/session.model";
import { parsePage } from "@/shared/utils/pagination";

import { AIMonitoringService } from "../service/ai-monitoring.service";

const aiMonitoringService = new AIMonitoringService();

export async function getAIMonitoringPage(
  kitchen: KitchenSummary,
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return aiMonitoringService.getPage(kitchen.id, kitchen.timezone, { eventsPage: parsePage(searchParams.page) });
}
