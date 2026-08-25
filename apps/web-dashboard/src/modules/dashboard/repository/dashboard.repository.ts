import type { DashboardOverview } from "../model/dashboard.model";

export class DashboardRepository {
  async getOverview(): Promise<DashboardOverview> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",
      overallScore: 87,
      hygieneStatus: "Good",
      lastUpdated: "Just now",

      pillars: [
        {
          id: "personal-hygiene",
          name: "Personal Hygiene",
          score: 92,
          description: "Hairnet, mask and gloves",
        },
        {
          id: "food-preparation",
          name: "Food Preparation",
          score: 82,
          description: "Surface cleanliness, spills and waste",
        },
        {
          id: "environmental-hygiene",
          name: "Environmental Hygiene",
          score: 88,
          description: "Temperature, humidity and refrigeration",
        },
      ],

      sensors: [
        {
          id: "temperature",
          name: "Kitchen Temperature",
          value: 27.1,
          unit: "°C",
          status: "Safe",
        },
        {
          id: "humidity",
          name: "Humidity",
          value: 61,
          unit: "%",
          status: "Safe",
        },
        {
          id: "refrigerator-temperature",
          name: "Refrigerator",
          value: 4.2,
          unit: "°C",
          status: "Safe",
        },
      ],
    };
  }
}