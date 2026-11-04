import Link from "next/link";
import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Cpu,
  RadioTower,
  type LucideIcon,
} from "lucide-react";

import { formatDateTime } from "@/shared/utils/time";

import {
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

const SOURCE_ICONS: Record<EvidenceSource, { icon: LucideIcon; className: string }> = {
  ai: { icon: BrainCircuit, className: "text-violet-600" },
  sensor: { icon: RadioTower, className: "text-sky-600" },
  system: { icon: Cpu, className: "text-slate-500" },
};

const STATUS_STYLES: Record<ViolationStatus, string> = {
  active: "bg-red-50 text-red-700",
  acknowledged: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

const AUDIT_LABELS: Record<AuditStatus, { label: string; className: string }> = {
  verified: { label: "Anchored", className: "text-emerald-700" },
  pending: { label: "Pending anchor", className: "text-amber-700" },
  failed: { label: "Anchor failed", className: "text-red-700" },
};

function evidence(v: ViolationRecord): string | null {
  if (v.aiConfidence !== null) return `${Math.round(v.aiConfidence * 100)}% confidence`;
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
  const first = (filters.page - 1) * 25 + 1;
  const last = first + rows.length - 1;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">
          No violations match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
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
                const source = SOURCE_ICONS[v.source];
                const SourceIcon = source.icon;
                const proof = evidence(v);
                const handledText = handled(v, timezone);
                const audit = v.auditStatus ? AUDIT_LABELS[v.auditStatus] : null;

                return (
                  <tr key={v.id} className="align-top text-sm text-slate-700 hover:bg-slate-50">
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
                        <SourceIcon className={`h-4 w-4 ${source.className}`} />
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
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[v.status]}`}
                      >
                        {v.status}
                      </span>
                      {handledText && (
                        <p className="mt-2 text-xs text-slate-500">{handledText}</p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {audit ? (
                        <span className={`text-xs font-semibold ${audit.className}`}>
                          {audit.label}
                        </span>
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

      {page.totalRows > 0 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-sm text-slate-500"
        >
          <p>
            {first}–{last} of {page.totalRows}
          </p>

          <div className="flex items-center gap-2">
            {filters.page > 1 ? (
              <Link
                href={filtersToQuery(filters, { page: filters.page - 1 }) || "?"}
                scroll={false}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            ) : null}

            <span>
              Page {filters.page} of {page.pageCount}
            </span>

            {filters.page < page.pageCount ? (
              <Link
                href={filtersToQuery(filters, { page: filters.page + 1 })}
                scroll={false}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </section>
  );
}
