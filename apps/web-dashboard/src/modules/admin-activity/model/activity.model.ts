import type { ActivityEntry } from "@/modules/admin-kitchens/model/kitchens.model";

export type { ActivityEntry };

const LABELS: Record<string, string> = {
  "kitchen.created": "Created kitchen",
  "kitchen.updated": "Edited listing",
  "kitchen.published": "Put kitchen live",
  "kitchen.hidden": "Hid kitchen from the app",
  "device.registered": "Registered device",
  "device.renamed": "Renamed device",
  "device.removed": "Removed device",
  "account.invited": "Invited",
  "account.role_changed": "Changed role of",
  "account.kitchen_added": "Gave kitchen access to",
  "account.kitchen_removed": "Removed kitchen access of",
  "account.disabled": "Disabled",
  "account.enabled": "Enabled",
  "account.setup_link_issued": "Created a set-up link for",
  "account.reset_link_issued": "Created a password link for",
  "account.login_ban_failed": "Could not block the login of",
  "account.bootstrap_admin": "Created the first administrator:",
};

export function actionLabel(action: string): string {
  return LABELS[action] ?? action;
}

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  location: "location",
  timezone: "time zone",
  cuisine: "cuisine",
  description: "description",
  emoji: "emoji",
  delivery_fee_lkr: "delivery fee",
  prep_minutes: "preparation time",
  opens_at: "opening time",
  closes_at: "closing time",
};

const ROLE_WORDS: Record<string, string> = { operator: "operator", phi: "inspector", admin: "administrator" };

/** One short line of what changed, from the entry's details. */
export function activitySummary(entry: ActivityEntry): string | null {
  const d = entry.details;
  switch (entry.action) {
    case "kitchen.updated": {
      const fields = Object.keys(d).map((k) => FIELD_LABELS[k] ?? k);
      return fields.length ? `Changed ${fields.join(", ")}` : null;
    }
    case "kitchen.created":
      return typeof d.code === "string" ? `Code ${d.code}` : null;
    case "device.registered":
      return typeof d.kitchen === "string" ? `For ${d.kitchen}` : null;
    case "account.invited":
      return [ROLE_WORDS[String(d.role)] ?? null, typeof d.kitchen === "string" ? `at ${d.kitchen}` : null]
        .filter(Boolean)
        .join(" ") || null;
    case "account.role_changed":
      return `${ROLE_WORDS[String(d.from)] ?? d.from} → ${ROLE_WORDS[String(d.to)] ?? d.to}`;
    case "account.kitchen_added":
    case "account.kitchen_removed":
    case "device.removed":
      return typeof d.kitchen === "string" ? d.kitchen : null;
    case "device.renamed":
      return typeof d.from === "string" ? `Was "${d.from}"` : null;
    default:
      return null;
  }
}
