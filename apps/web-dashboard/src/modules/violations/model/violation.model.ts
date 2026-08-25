export type ViolationSeverity =
  | "Low"
  | "Medium"
  | "High"
  | "Critical";

export type ViolationStatus =
  | "Active"
  | "Resolved"
  | "Acknowledged";

export type ViolationPillar =
  | "Personal Hygiene"
  | "Food Preparation Hygiene"
  | "Environmental Hygiene";

export type ViolationSource =
  | "AI"
  | "Sensor";

export interface Violation {
  id: string;
  timestamp: string;

  pillar: ViolationPillar;
  source: ViolationSource;

  title: string;
  description: string;

  severity: ViolationSeverity;
  status: ViolationStatus;

  scoreImpact: number;

  confidence?: number;

  sensorValue?: number;
  sensorUnit?: string;

  blockchainStatus?: "Pending" | "Anchored" | "Not Required";
}

export interface ViolationSummary {
  total: number;
  active: number;
  resolved: number;
  highSeverity: number;
}

export interface ViolationData {
  kitchenName: string;
  summary: ViolationSummary;
  violations: Violation[];
}