export interface KitchenProfile {
  kitchenId: string;
  kitchenName: string;
  location: string;
  operatorName: string;
}

/** Whether the kitchen's monitoring is running right now (from the devices' latest reports). */
export interface MonitoringStatus {
  cameraOnline: boolean;
  sensorsOnline: boolean;
  /** Latest sensor reading, in the kitchen's time zone; null before the first one. */
  lastReadingLabel: string | null;
}

/** The signed-in user's own account, shown and edited on the Settings page. */
export interface AccountSettings {
  fullName: string | null;
  email: string;
  phone: string | null;
  roleLabel: string;
  /** When this device signed in, in the kitchen's time zone. */
  signedInLabel: string;
}

export interface SettingsData {
  kitchenProfile: KitchenProfile;
  monitoring: MonitoringStatus;
  account: AccountSettings;
}
