import type {
  ViolationData,
} from "../model/violation.model";

export class ViolationRepository {
  async getViolationData(): Promise<ViolationData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",

      summary: {
        total: 7,
        active: 2,
        resolved: 5,
        highSeverity: 1,
      },

      violations: [
        {
          id: "VIO-001",
          timestamp: "25 Aug 2026, 15:46",

          pillar: "Personal Hygiene",
          source: "AI",

          title: "Gloves Missing",

          description:
            "AI monitoring detected a food handler without required gloves.",

          severity: "Medium",
          status: "Active",

          scoreImpact: -8,

          confidence: 91,

          blockchainStatus: "Pending",
        },

        {
          id: "VIO-002",
          timestamp: "25 Aug 2026, 15:42",

          pillar: "Food Preparation Hygiene",
          source: "AI",

          title: "Food Spill Detected",

          description:
            "Food spill detected on the preparation surface.",

          severity: "Medium",
          status: "Active",

          scoreImpact: -6,

          confidence: 89,

          blockchainStatus: "Pending",
        },

        {
          id: "VIO-003",
          timestamp: "25 Aug 2026, 13:15",

          pillar: "Environmental Hygiene",
          source: "Sensor",

          title: "Refrigerator Temperature Warning",

          description:
            "Refrigerator temperature exceeded the configured monitoring range.",

          severity: "High",
          status: "Resolved",

          scoreImpact: -12,

          sensorValue: 8.1,
          sensorUnit: "°C",

          blockchainStatus: "Anchored",
        },

        {
          id: "VIO-004",
          timestamp: "25 Aug 2026, 11:22",

          pillar: "Personal Hygiene",
          source: "AI",

          title: "Mask Non-Compliance",

          description:
            "Mask compliance was not detected during monitoring.",

          severity: "Medium",
          status: "Resolved",

          scoreImpact: -7,

          confidence: 87,

          blockchainStatus: "Anchored",
        },

        {
          id: "VIO-005",
          timestamp: "25 Aug 2026, 10:08",

          pillar: "Food Preparation Hygiene",
          source: "AI",

          title: "Dirty Surface Detected",

          description:
            "Preparation surface was classified as requiring attention.",

          severity: "Medium",
          status: "Resolved",

          scoreImpact: -5,

          confidence: 88,

          blockchainStatus: "Anchored",
        },

        {
          id: "VIO-006",
          timestamp: "25 Aug 2026, 09:31",

          pillar: "Environmental Hygiene",
          source: "Sensor",

          title: "Humidity Warning",

          description:
            "Kitchen humidity exceeded the configured monitoring range.",

          severity: "Low",
          status: "Resolved",

          scoreImpact: -3,

          sensorValue: 74,
          sensorUnit: "%",

          blockchainStatus: "Not Required",
        },

        {
          id: "VIO-007",
          timestamp: "24 Aug 2026, 18:47",

          pillar: "Personal Hygiene",
          source: "AI",

          title: "Hairnet Non-Compliance",

          description:
            "Hairnet compliance was not detected.",

          severity: "Low",
          status: "Resolved",

          scoreImpact: -4,

          confidence: 84,

          blockchainStatus: "Not Required",
        },
      ],
    };
  }
}