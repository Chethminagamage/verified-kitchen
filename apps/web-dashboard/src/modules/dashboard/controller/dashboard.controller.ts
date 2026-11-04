import type { KitchenSummary } from "@/modules/auth/model/session.model";

import { DashboardService } from "../service/dashboard.service";

const dashboardService = new DashboardService();

export async function getDashboardOverview(
  kitchen: KitchenSummary
) {
  return dashboardService.getOverview(
    kitchen.id,
    kitchen.timezone
  );
}
