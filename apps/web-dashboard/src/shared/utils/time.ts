/** "just now", "45 s ago", "12 min ago", "3 h ago", "2 days ago". */
export function formatRelative(
  iso: string,
  now: Date | string
): string {
  const nowMs =
    typeof now === "string" ? new Date(now).getTime() : now.getTime();
  const seconds = Math.max(
    0,
    Math.round((nowMs - new Date(iso).getTime()) / 1000)
  );

  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;

  return `${Math.round(hours / 24)} days ago`;
}

/*
 * Dates are assembled from Intl parts rather than Intl's finished string:
 * Node and browsers ship different locale data (e.g. "4 Nov, 14:05" vs
 * "4 Nov at 14:05"), which would make server and client HTML differ.
 */
type PartName = "day" | "month" | "hour" | "minute";

const partFormatters = new Map<string, Intl.DateTimeFormat>();

function parts(iso: string, timeZone: string): Record<PartName, string> {
  let formatter = partFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partFormatters.set(timeZone, formatter);
  }

  const out: Record<PartName, string> = { day: "", month: "", hour: "", minute: "" };

  for (const part of formatter.formatToParts(new Date(iso))) {
    if (part.type in out) {
      out[part.type as PartName] = part.value;
    }
  }

  return out;
}

/** Time of day in the kitchen's own time zone, e.g. "14:05". */
export function formatClock(iso: string, timeZone: string): string {
  const p = parts(iso, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** Date and time in the kitchen's time zone, e.g. "4 Nov 14:05". */
export function formatDateTime(iso: string, timeZone: string): string {
  const p = parts(iso, timeZone);
  return `${p.day} ${p.month} ${p.hour}:${p.minute}`;
}
