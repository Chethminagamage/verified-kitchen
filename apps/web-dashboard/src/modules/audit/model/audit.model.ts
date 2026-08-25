export type AuditVerificationStatus =
  | "Verified"
  | "Pending"
  | "Failed";

export type AuditEventType =
  | "PPE Violation"
  | "Food Preparation Violation"
  | "Environmental Violation"
  | "Hygiene Score Event";

export interface AuditRecord {
  id: string;

  violationId?: string;

  timestamp: string;

  eventType: AuditEventType;

  description: string;

  kitchenId: string;

  eventHash: string;

  transactionId?: string;

  blockNumber?: number;

  verificationStatus: AuditVerificationStatus;
}

export interface AuditSummary {
  totalRecords: number;
  verifiedRecords: number;
  pendingRecords: number;
  failedRecords: number;
}

export interface AuditTrailData {
  kitchenName: string;
  networkName: string;
  ledgerType: string;
  summary: AuditSummary;
  records: AuditRecord[];
}