export type HygieneCheckStatus =
  | "Compliant"
  | "Non-Compliant"
  | "Safe"
  | "Warning";

export type MonitoringSource = "AI" | "Sensor";

export interface HygieneCheck {
  id: string;
  name: string;
  status: HygieneCheckStatus;
  source: MonitoringSource;

  confidence?: number;

  value?: number;
  unit?: string;

  lastChecked: string;
}

export interface HygienePillar {
  id: string;
  name: string;
  score: number;
  description: string;
  checks: HygieneCheck[];
}

export interface HygieneMonitoringData {
  kitchenName: string;
  overallScore: number;
  lastUpdated: string;
  pillars: HygienePillar[];
}