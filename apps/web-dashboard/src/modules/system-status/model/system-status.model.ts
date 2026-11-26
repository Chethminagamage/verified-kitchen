export type ConnectionState =
  | "online"
  | "degraded"
  | "offline";

export interface DeviceHeartbeat {
  id: string;
  name: string;
  type: "env_node" | "camera";
  lastSeenAt: string | null;
  /** The broker published the device's last will ("offline"). */
  reportedOffline?: boolean;
}

export type NotificationSeverity = "low" | "medium" | "high" | "critical";

/** One entry in the header's notification centre: an open violation. */
export interface NotificationItem {
  id: string;
  title: string;
  severity: NotificationSeverity;
  /** "active" needs action; "acknowledged" has been seen but is not resolved. */
  status: "active" | "acknowledged";
  occurredAt: string;
}

export interface SystemStatus {
  state: ConnectionState;
  onlineDevices: number;
  totalDevices: number;
  activeViolations: number;
  /** Newest open violations, in the same order as the Violations page. */
  notifications: NotificationItem[];
  generatedAt: string;
}

/**
 * Notifications shown in the header. Kept below the Violations page size (25)
 * so every notification is on that page's first page and can be scrolled to.
 */
export const NOTIFICATIONS_SHOWN = 8;

/** Where a notification leads: its row on the Violations page (open violations, newest first). */
export function notificationHref(id: string): string {
  return `/dashboard/violations#violation-${id}`;
}

/** A device that has not reported within this time is treated as offline. */
export const DEVICE_OFFLINE_AFTER_MS = 2 * 60 * 1000;
