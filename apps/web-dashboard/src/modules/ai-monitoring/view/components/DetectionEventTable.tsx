import { formatDateTime } from "@/shared/utils/time";

import type { DetectionEvent } from "../../model/ai-monitoring.model";

interface DetectionEventTableProps {
  events: DetectionEvent[];
  timezone: string;
}

export default function DetectionEventTable({ events, timezone }: DetectionEventTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-950">Recent Detection Windows</h3>
        <p className="mt-1 text-sm text-slate-500">
          {events.length === 0
            ? "Nothing in the last hour. Results appear when the camera process runs and a worker is in view."
            : "Newest first. Each row is one 5-second window, aggregated on the edge computer from the frames that showed the item."}
        </p>
      </div>

      {events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Window end</th>
                <th className="px-6 py-3 font-semibold">Item</th>
                <th className="px-6 py-3 font-semibold">Result</th>
                <th className="px-6 py-3 font-semibold">Confidence</th>
                <th className="px-6 py-3 font-semibold">Frames</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.key} className="text-sm text-slate-700">
                  <td className="whitespace-nowrap px-6 py-3 tabular-nums">{formatDateTime(e.at, timezone)}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{e.indicator}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        e.compliant ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {e.compliant ? "Compliant" : "Non-Compliant"}
                    </span>
                  </td>
                  <td className="px-6 py-3 tabular-nums">{Math.round(e.confidence * 100)}%</td>
                  <td className="px-6 py-3 tabular-nums text-slate-500">
                    {e.framesObserved === null || e.framesCompliant === null
                      ? "—"
                      : `${e.compliant ? e.framesCompliant : e.framesObserved - e.framesCompliant} / ${e.framesObserved}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
