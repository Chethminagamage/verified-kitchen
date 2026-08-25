import type {
  EnvironmentalMonitoringData,
} from "../model/environment.model";

export class EnvironmentRepository {
  async getEnvironmentalMonitoringData(): Promise<EnvironmentalMonitoringData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",
      pillarScore: 88,
      lastUpdated: "Just now",

      sensors: [
        {
          id: "ambient-temperature",
          type: "temperature",
          name: "Kitchen Temperature",
          value: 27.1,
          unit: "°C",
          status: "Safe",
          deviceName: "DHT22",
          lastUpdated: "Just now",

          readings: [
            { timestamp: "08:00", value: 25.4 },
            { timestamp: "09:00", value: 25.8 },
            { timestamp: "10:00", value: 26.1 },
            { timestamp: "11:00", value: 26.7 },
            { timestamp: "12:00", value: 27.2 },
            { timestamp: "13:00", value: 27.5 },
            { timestamp: "14:00", value: 27.3 },
            { timestamp: "15:00", value: 27.1 },
          ],
        },

        {
          id: "ambient-humidity",
          type: "humidity",
          name: "Humidity",
          value: 61,
          unit: "%",
          status: "Safe",
          deviceName: "DHT22",
          lastUpdated: "Just now",

          readings: [
            { timestamp: "08:00", value: 57 },
            { timestamp: "09:00", value: 58 },
            { timestamp: "10:00", value: 59 },
            { timestamp: "11:00", value: 60 },
            { timestamp: "12:00", value: 62 },
            { timestamp: "13:00", value: 63 },
            { timestamp: "14:00", value: 62 },
            { timestamp: "15:00", value: 61 },
          ],
        },

        {
          id: "refrigerator-temperature",
          type: "refrigerator",
          name: "Refrigerator Temperature",
          value: 4.2,
          unit: "°C",
          status: "Safe",
          deviceName: "DS18B20",
          lastUpdated: "Just now",

          readings: [
            { timestamp: "08:00", value: 3.8 },
            { timestamp: "09:00", value: 3.9 },
            { timestamp: "10:00", value: 4.0 },
            { timestamp: "11:00", value: 4.1 },
            { timestamp: "12:00", value: 4.3 },
            { timestamp: "13:00", value: 4.4 },
            { timestamp: "14:00", value: 4.3 },
            { timestamp: "15:00", value: 4.2 },
          ],
        },
      ],
    };
  }
}