import type {
  HygieneMonitoringData,
} from "../model/hygiene.model";

export class HygieneRepository {
  async getHygieneMonitoringData(): Promise<HygieneMonitoringData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",
      overallScore: 87,
      lastUpdated: "Just now",

      pillars: [
        {
          id: "personal-hygiene",
          name: "Personal Hygiene",
          score: 92,
          description:
            "Monitoring protective hygiene compliance of kitchen workers.",

          checks: [
            {
              id: "hairnet",
              name: "Hairnet",
              status: "Compliant",
              source: "AI",
              confidence: 96,
              lastChecked: "Just now",
            },
            {
              id: "mask",
              name: "Mask",
              status: "Compliant",
              source: "AI",
              confidence: 94,
              lastChecked: "Just now",
            },
            {
              id: "gloves",
              name: "Gloves",
              status: "Non-Compliant",
              source: "AI",
              confidence: 91,
              lastChecked: "Just now",
            },
          ],
        },

        {
          id: "food-preparation",
          name: "Food Preparation Hygiene",
          score: 82,
          description:
            "Monitoring cleanliness and visible hygiene conditions of preparation areas.",

          checks: [
            {
              id: "clean-surface",
              name: "Clean Preparation Surface",
              status: "Compliant",
              source: "AI",
              confidence: 92,
              lastChecked: "Just now",
            },
            {
              id: "food-spills",
              name: "Food Spills",
              status: "Non-Compliant",
              source: "AI",
              confidence: 89,
              lastChecked: "Just now",
            },
            {
              id: "food-waste",
              name: "Food Waste",
              status: "Compliant",
              source: "AI",
              confidence: 93,
              lastChecked: "Just now",
            },
            {
              id: "dirty-surfaces",
              name: "Dirty Surfaces",
              status: "Compliant",
              source: "AI",
              confidence: 90,
              lastChecked: "Just now",
            },
          ],
        },

        {
          id: "environmental-hygiene",
          name: "Environmental Hygiene",
          score: 88,
          description:
            "Monitoring environmental conditions that contribute to kitchen hygiene.",

          checks: [
            {
              id: "temperature",
              name: "Kitchen Temperature",
              status: "Safe",
              source: "Sensor",
              value: 27.1,
              unit: "°C",
              lastChecked: "Just now",
            },
            {
              id: "humidity",
              name: "Humidity",
              status: "Safe",
              source: "Sensor",
              value: 61,
              unit: "%",
              lastChecked: "Just now",
            },
            {
              id: "refrigerator-temperature",
              name: "Refrigerator Temperature",
              status: "Safe",
              source: "Sensor",
              value: 4.2,
              unit: "°C",
              lastChecked: "Just now",
            },
          ],
        },
      ],
    };
  }
}