import type { KitchenSummary } from "@/modules/auth/model/session.model";

import { ReportsService } from "../service/reports.service";

const reportsService = new ReportsService();

export async function getReportsData(kitchen: KitchenSummary) {
  return reportsService.getReportsData(kitchen);
}
