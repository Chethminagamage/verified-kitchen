import type {
  SettingsData,
} from "../model/settings.model";

export class SettingsRepository {
  async getSettingsData(): Promise<SettingsData> {
    return {
      kitchenProfile: {
        kitchenId: "KITCHEN-001",
        kitchenName: "Verified Kitchen - Test Kitchen",
        location: "Kandy, Sri Lanka",
        operatorName: "Kitchen Operator",
      },

      monitoring: {
        aiMonitoringEnabled: true,
        environmentalMonitoringEnabled: true,
        auditLoggingEnabled: true,
        scoreRefreshInterval: "Real-time",
        privacyMode: "Edge processing enabled",
      },

      notifications: {
        violationAlerts: true,
        criticalAlerts: true,
        sensorWarnings: true,
        dailySummary: false,
      },

      system: {
        applicationVersion: "0.1.0 Prototype",
        aiModel: "YOLOv8n",
        edgeDevice: "Local Edge Laptop",
        database: "PostgreSQL / Supabase",
        blockchainPlatform: "Hyperledger Fabric",
        lastSync: "Development mode",
      },
    };
  }
}