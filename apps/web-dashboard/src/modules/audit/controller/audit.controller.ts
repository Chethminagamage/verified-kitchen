import type { KitchenSummary, OperatorSession } from "@/modules/auth/model/session.model";

import { AuditService } from "../service/audit.service";

const auditService = new AuditService();

export async function getAuditPage(session: OperatorSession, kitchen: KitchenSummary) {
  return auditService.getPage(kitchen.id, kitchen.timezone, session.userId);
}
