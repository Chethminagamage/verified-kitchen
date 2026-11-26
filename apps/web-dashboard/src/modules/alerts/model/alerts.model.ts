/*
 * Desktop alerts: while the console is open, a browser notification (and an
 * optional chime) appears when a serious violation is raised. Preferences are
 * kept per device, because they depend on that device's browser permission.
 * Pure logic only (unit-tested).
 */

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface AlertPrefs {
  enabled: boolean;
  /** Also alert for high severity (critical always alerts when enabled). */
  includeHigh: boolean;
  sound: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPrefs = { enabled: false, includeHigh: true, sound: true };

/** Versioned, so a future change of shape cannot misread old saved values. */
export const ALERT_PREFS_STORAGE_KEY = "vk.alertPrefs.v1";

/** Reads saved preferences; anything missing or malformed falls back to the defaults. */
export function parseAlertPrefs(raw: string | null): AlertPrefs {
  if (!raw) return DEFAULT_ALERT_PREFS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_ALERT_PREFS;
    const v = value as Record<string, unknown>;
    const flag = (key: keyof AlertPrefs) => (typeof v[key] === "boolean" ? (v[key] as boolean) : DEFAULT_ALERT_PREFS[key]);
    return { enabled: flag("enabled"), includeHigh: flag("includeHigh"), sound: flag("sound") };
  } catch {
    return DEFAULT_ALERT_PREFS;
  }
}

/** Whether a newly raised violation of this severity should alert. */
export function shouldAlert(prefs: AlertPrefs, severity: string): boolean {
  if (!prefs.enabled) return false;
  return severity === "critical" || (severity === "high" && prefs.includeHigh);
}

export function alertHeading(severity: string): string {
  return severity === "critical" ? "Critical hygiene problem" : "High-severity hygiene problem";
}
