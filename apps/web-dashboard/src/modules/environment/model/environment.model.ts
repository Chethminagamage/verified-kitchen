export type EnvironmentalStatus =
  | "Safe"
  | "Warning"
  | "Critical";

export type EnvironmentalSensorType =
  | "temperature"
  | "humidity"
  | "refrigerator";

export interface EnvironmentalReading {
  timestamp: string;
  value: number;
}

export interface EnvironmentalSensor {
  id: string;
  type: EnvironmentalSensorType;
  name: string;
  value: number;
  unit: string;
  status: EnvironmentalStatus;
  deviceName: string;
  lastUpdated: string;
  readings: EnvironmentalReading[];
}

export interface EnvironmentalMonitoringData {
  kitchenName: string;
  pillarScore: number;
  lastUpdated: string;
  sensors: EnvironmentalSensor[];
}