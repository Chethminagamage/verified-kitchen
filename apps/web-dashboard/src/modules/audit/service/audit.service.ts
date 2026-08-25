import { AuditRepository } from "../repository/audit.repository";

export class AuditService {
  constructor(
    private readonly auditRepository =
      new AuditRepository()
  ) {}

  async getAuditTrailData() {
    return this.auditRepository.getAuditTrailData();
  }
}