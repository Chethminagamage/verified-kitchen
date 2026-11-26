import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import { formatDateTime } from "@/shared/utils/time";

import { actionLabel, activitySummary, type ActivityEntry } from "../model/activity.model";

/** Compact log: "admin@x · 4 Nov 14:05 — Put kitchen live: Lake View Kitchen". */
export default function ActivityList({ entries, empty = "Nothing recorded yet." }: { entries: ActivityEntry[]; empty?: string }) {
  if (entries.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ol className="space-y-4">
      {entries.map((e) => {
        const summary = activitySummary(e);
        return (
          <li key={e.id} className="flex gap-3">
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" />
            <div className="min-w-0 text-sm">
              <p className="text-slate-900">
                {actionLabel(e.action)} <span className="font-medium">{e.targetLabel ?? e.targetId}</span>
              </p>
              {summary && <p className="text-xs text-slate-600">{summary}</p>}
              <p className="text-xs text-slate-400">
                {e.actorEmail ?? "Deleted account"} ·{" "}
                <time dateTime={e.createdAt}>{formatDateTime(e.createdAt, PLATFORM_TIMEZONE)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
