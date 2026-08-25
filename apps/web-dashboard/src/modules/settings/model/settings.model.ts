export interface KitchenProfile {
  kitchenId: string;
  kitchenName: string;
  location: string;
  operatorName: string;
}

export interface MonitoringConfiguration {
  aiMonitoringEnabled: boolean;
  environmentalMonitoringEnabled: boolean;
  auditLoggingEnabled: boolean;
  scoreRefreshInterval: string;
  privacyMode: string;
}

export interface NotificationSettings {
  violationAlerts: boolean;
  criticalAlerts: boolean;
  sensorWarnings: boolean;
  dailySummary: boolean;
}

export interface SystemInformation {
  applicationVersion: string;
  aiModel: string;
  edgeDevice: string;
  database: string;
  blockchainPlatform: string;
  lastSync: string;
}

export interface SettingsData {
  kitchenProfile: KitchenProfile;
  monitoring: MonitoringConfiguration;
  notifications: NotificationSettings;
  system: SystemInformation;
}