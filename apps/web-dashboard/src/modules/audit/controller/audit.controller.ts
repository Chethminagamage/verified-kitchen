import { AuditService } from "../service/audit.service";

const auditService = new AuditService();

export async function getAuditTrailData() {
  return auditService.getAuditTrailData();
}