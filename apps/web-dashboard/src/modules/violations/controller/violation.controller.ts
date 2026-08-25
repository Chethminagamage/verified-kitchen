import { ViolationService } from "../service/violation.service";

const violationService = new ViolationService();

export async function getViolationData() {
  return violationService.getViolationData();
}