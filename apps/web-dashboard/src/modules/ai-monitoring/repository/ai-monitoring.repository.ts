import type {
  AIMonitoringData,
} from "../model/ai-monitoring.model";

export class AIMonitoringRepository {
  async getMonitoringData(): Promise<AIMonitoringData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",

      system: {
        modelName: "YOLOv8n",
        modelVersion: "Prototype v1",
        modelStatus: "Online",
        cameraStatus: "Online",
        edgeDeviceStatus: "Online",
        inferenceLatency: 74,
        lastInference: "Just now",
      },

      personalHygieneDetections: [
        {
          id: "hairnet",
          name: "Hairnet",
          category: "Personal Hygiene",
          status: "Compliant",
          confidence: 96,
          lastChecked: "Just now",
        },
        {
          id: "mask",
          name: "Mask",
          category: "Personal Hygiene",
          status: "Compliant",
          confidence: 94,
          lastChecked: "Just now",
        },
        {
          id: "gloves",
          name: "Gloves",
          category: "Personal Hygiene",
          status: "Non-Compliant",
          confidence: 91,
          lastChecked: "Just now",
        },
      ],

      foodPreparationDetections: [
        {
          id: "clean-preparation-surface",
          name: "Clean Preparation Surface",
          category: "Food Preparation Hygiene",
          status: "Compliant",
          confidence: 92,
          lastChecked: "Just now",
        },
        {
          id: "food-spills",
          name: "Food Spills",
          category: "Food Preparation Hygiene",
          status: "Detected",
          confidence: 89,
          lastChecked: "Just now",
        },
        {
          id: "food-waste",
          name: "Food Waste",
          category: "Food Preparation Hygiene",
          status: "Clear",
          confidence: 93,
          lastChecked: "Just now",
        },
        {
          id: "dirty-surfaces",
          name: "Dirty Surfaces",
          category: "Food Preparation Hygiene",
          status: "Clear",
          confidence: 90,
          lastChecked: "Just now",
        },
      ],

      recentEvents: [
        {
          id: "EVT-AI-001",
          timestamp: "15:46",
          detection: "Gloves",
          category: "Personal Hygiene",
          confidence: 91,
          result: "Non-Compliant",
        },
        {
          id: "EVT-AI-002",
          timestamp: "15:42",
          detection: "Food Spills",
          category: "Food Preparation Hygiene",
          confidence: 89,
          result: "Detected",
        },
        {
          id: "EVT-AI-003",
          timestamp: "15:39",
          detection: "Hairnet",
          category: "Personal Hygiene",
          confidence: 96,
          result: "Compliant",
        },
        {
          id: "EVT-AI-004",
          timestamp: "15:35",
          detection: "Mask",
          category: "Personal Hygiene",
          confidence: 94,
          result: "Compliant",
        },
      ],
    };
  }
}