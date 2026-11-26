import {
  Camera,
  Cpu,
  ListFilter,
  RadioTower,
  type LucideIcon,
} from "lucide-react";

import EmptyState from "@/shared/components/ui/EmptyState";
import Pagination from "@/shared/components/ui/Pagination";
import { Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForStatus, type Tone } from "@/shared/components/ui/tone";
import { formatDateTime } from "@/shared/utils/time";

import {
  PAGE_SIZE,
  PILLAR_LABELS,
  SOURCE_LABELS,
  filtersToQuery,
  type AuditStatus,
  type EvidenceSource,
  type ViolationPage,
  type ViolationRecord,
  type ViolationStatus,
} from "../../model/violation.model";

import ViolationRowActions from "./ViolationRowActions";
import ViolationSeverityBadge from "./ViolationSeverityBadge";

const SOURCE_ICONS: Record<EvidenceSource, LucideIcon> = {
  ai: Camera,
  sensor: RadioTower,
  system: Cpu,
};

const STATUS_LABELS: Record<ViolationStatus, string> = {
  active: "Active",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

/** "Recorded" is the normal state until the independent ledger is connected, so it is neutral. */
const AUDIT_LABELS: Record<AuditStatus, { label: string; tone: Tone }> = {
  verified: { label: "Secured", tone: "positive" },
  pending: { label: "Recorded", tone: "neutral" },
  failed: { label: "Needs attention", tone: "critical" },
};

function evidence(v: ViolationRecord): string | null {
  if (v.aiConfidence !== null) return "Seen by camera";
  if (v.sensorValue !== null) return `${v.sensorValue.toFixed(1)} ${v.sensorUnit ?? ""}`.trim();
  return null;
}

function handled(v: ViolationRecord, tz: string): string | null {
  const who = v.acknowledgedByMe ? "you" : null;

  if (v.status === "resolved" && v.resolvedAt) {
    return `Resolved ${formatDateTime(v.resolvedAt, tz)}${who ? ` by ${who}` : ""}`;
  }

  if (v.status === "acknowledged" && v.acknowledgedAt) {
    return `Acknowledged ${formatDateTime(v.acknowledgedAt, tz)}${who ? ` by ${who}` : ""}`;
  }

  return null;
}

interface ViolationTableProps {
  page: ViolationPage;
}

export default function ViolationTable({
  page,
}: ViolationTableProps) {
  const { rows, filters, timezone, canManage } = page;
  const first = (filters.page - 1) * PAGE_SIZE + 1;
  const last = first + rows.length - 1;

  return (
    <Panel padded={false} className="overflow-hidden">
      {rows.length === 0 ? (
        <EmptyState icon={ListFilter} title="No violations match these filters">
          Try another status, pillar or severity.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <th className="px-6 py-3 font-semibold">Event</th>
                <th className="px-6 py-3 font-semibold">Pillar</th>
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold">Severity</th>
                <th className="px-6 py-3 font-semibold">Score impact</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Audit</th>
                {canManage && <th className="px-6 py-3 text-right font-semibold">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((v) => {
                const SourceIcon = SOURCE_ICONS[v.source];
                const proof = evidence(v);
                const handledText = handled(v, timezone);
                const audit = v.auditStatus ? AUDIT_LABELS[v.auditStatus] : null;

                return (
                  <tr
                    key={v.id}
                    id={`violation-${v.id}`}
                    // A notification links here (#violation-id): scroll below the sticky header and highlight the row.
                    className="scroll-mt-28 align-top text-sm text-slate-700 transition hover:bg-slate-50/60 target:animate-row-highlight target:bg-emerald-50/70 target:shadow-[inset_3px_0_0_0_var(--color-emerald-500)]"
                  >
                    <td className="min-w-72 px-6 py-4">
                      <p className="font-medium text-slate-950">{v.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(v.occurredAt, timezone)}
                      </p>
                      {v.description && (
                        <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                          {v.description}
                        </p>
                      )}
                    </td>

                    <td className="min-w-40 px-6 py-4">{PILLAR_LABELS[v.pillar]}</td>

                    <td className="min-w-36 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <SourceIcon className="h-4 w-4 text-slate-500" aria-hidden />
                        {SOURCE_LABELS[v.source]}
                      </div>
                      {proof && <p className="mt-1 text-xs text-slate-500">{proof}</p>}
                    </td>

                    <td className="px-6 py-4">
                      <ViolationSeverityBadge severity={v.severity} />
                    </td>

                    <td className="px-6 py-4 tabular-nums">
                      {v.scoreImpact === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          −{v.scoreImpact.toFixed(1)} pts
                        </span>
                      )}
                    </td>

                    <td className="min-w-40 px-6 py-4">
                      <StatusPill tone={toneForStatus(v.status)}>{STATUS_LABELS[v.status]}</StatusPill>
                      {handledText && (
                        <p className="mt-2 text-xs text-slate-500">{handledText}</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {audit ? (
                        <StatusPill tone={audit.tone} icon={null}>
                          {audit.label}
                        </StatusPill>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    {canManage && (
                      <td className="px-6 py-4">
                        <ViolationRowActions id={v.id} status={v.status} title={v.title} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={filters.page}
        pageCount={page.pageCount}
        total={page.totalRows}
        first={first}
        last={last}
        hrefFor={(n) => filtersToQuery(filters, { page: n }) || "?"}
        noun="violations"
      />
    </Panel>
  );
}
