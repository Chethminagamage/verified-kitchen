import { HygieneService } from "../service/hygiene.service";

const hygieneService = new HygieneService();

export async function getHygieneMonitoringData() {
  return hygieneService.getMonitoringData();
}