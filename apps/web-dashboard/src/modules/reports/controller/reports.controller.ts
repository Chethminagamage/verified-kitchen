import { ReportsService } from "../service/reports.service";

const reportsService = new ReportsService();

export async function getReportsData() {
  return reportsService.getReportsData();
}