export type HygieneStatus = "Excellent" | "Good" | "Moderate" | "Poor";

export interface PillarScore {
  id: string;
  name: string;
  score: number;
  description: string;
}

export interface SensorSummary {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "Safe" | "Warning" | "Critical";
}

export interface DashboardOverview {
  kitchenName: string;
  overallScore: number;
  hygieneStatus: HygieneStatus;
  lastUpdated: string;
  pillars: PillarScore[];
  sensors: SensorSummary[];
}