export type AIComponentStatus =
  | "Online"
  | "Offline"
  | "Warning";

export type DetectionStatus =
  | "Compliant"
  | "Non-Compliant"
  | "Clear"
  | "Detected";

export type DetectionCategory =
  | "Personal Hygiene"
  | "Food Preparation Hygiene";

export interface AISystemStatus {
  modelName: string;
  modelVersion: string;
  modelStatus: AIComponentStatus;
  cameraStatus: AIComponentStatus;
  edgeDeviceStatus: AIComponentStatus;
  inferenceLatency: number;
  lastInference: string;
}

export interface AIDetection {
  id: string;
  name: string;
  category: DetectionCategory;
  status: DetectionStatus;
  confidence: number;
  lastChecked: string;
}

export interface AIDetectionEvent {
  id: string;
  timestamp: string;
  detection: string;
  category: DetectionCategory;
  confidence: number;
  result: DetectionStatus;
}

export interface AIMonitoringData {
  kitchenName: string;
  system: AISystemStatus;
  personalHygieneDetections: AIDetection[];
  foodPreparationDetections: AIDetection[];
  recentEvents: AIDetectionEvent[];
}