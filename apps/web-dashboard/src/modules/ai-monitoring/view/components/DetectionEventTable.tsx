import { ScanLine } from "lucide-react";

import EmptyState from "@/shared/components/ui/EmptyState";
import Pagination from "@/shared/components/ui/Pagination";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { formatDateTime } from "@/shared/utils/time";

import type { AIMonitoringPage, DetectionEvent } from "../../model/ai-monitoring.model";

interface DetectionEventTableProps {
  events: DetectionEvent[];
  pagination: AIMonitoringPage["eventsPagination"];
  timezone: string;
}

/** Page links keep the user on this page; page 1 drops the parameter. */
const hrefFor = (page: number) => (page > 1 ? `?page=${page}` : "?");

/** The latest camera checks, newest first. */
export default function DetectionEventTable({ events, pagination, timezone }: DetectionEventTableProps) {
  return (
    <Panel padded={false} className="overflow-hidden">
      <PanelHeader
        className="border-b border-slate-100 p-5 sm:p-6"
        title="Recent checks"
        description={
          events.length > 0 ? "Last hour, newest first. Each row is one automatic check, made every few seconds." : undefined
        }
      />

      {events.length === 0 ? (
        <EmptyState icon={ScanLine} title="Nothing in the last hour">
          Results appear when the camera is running and someone is working in view.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Time</th>
                <th className="px-6 py-3 font-semibold">Item</th>
                <th className="px-6 py-3 font-semibold">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.key} className="text-sm text-slate-700 transition hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-6 py-3 tabular-nums">{formatDateTime(e.at, timezone)}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{e.indicator}</td>
                  <td className="px-6 py-3">
                    <StatusPill tone={e.compliant ? "positive" : "critical"}>
                      {e.compliant ? "Compliant" : "Non-Compliant"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination {...pagination} hrefFor={hrefFor} noun="checks" />
    </Panel>
  );
}
