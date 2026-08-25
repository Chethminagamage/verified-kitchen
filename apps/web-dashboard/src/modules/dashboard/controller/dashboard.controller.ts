import { DashboardService } from "../service/dashboard.service";

const dashboardService = new DashboardService();

export async function getDashboardOverview() {
  return dashboardService.getDashboardOverview();
}