import Link from "next/link";
import { Blocks } from "lucide-react";

import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel, PanelHeader } from "@/shared/components/ui/Panel";
import { formatDateTime } from "@/shared/utils/time";

import type { AuditRecordView } from "../../model/audit.model";

import VerificationBadge from "./VerificationBadge";

function short(hash: string): string {
  return hash === "GENESIS" ? "First record" : `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

interface AuditRecordTableProps {
  records: AuditRecordView[];
  total: number;
  timezone: string;
}

export default function AuditRecordTable({ records, total, timezone }: AuditRecordTableProps) {
  return (
    <Panel padded={false} className="overflow-hidden">
      <PanelHeader
        className="border-b border-slate-100 p-5 sm:p-6"
        title="Audit records"
        description={
          total === 0
            ? undefined
            : `Newest first${total > records.length ? ` · showing the latest ${records.length} of ${total}` : ""}. Records are written automatically and cannot be edited or deleted.`
        }
      />

      {records.length === 0 && (
        <EmptyState icon={Blocks} title="No records yet">
          Records appear when a problem is detected or someone updates one.
        </EmptyState>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <th className="px-6 py-3 font-semibold">#</th>
                <th className="px-6 py-3 font-semibold">Event</th>
                <th className="px-6 py-3 font-semibold">Record fingerprint</th>
                <th className="px-6 py-3 font-semibold">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id} className="align-top text-sm text-slate-700 transition hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{r.seq}</td>
                  <td className="min-w-72 px-6 py-4">
                    <p className="font-medium text-slate-950">{r.eventLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(r.createdAt, timezone)}</p>
                    {r.description && <p className="mt-1 text-xs text-slate-600">{r.description}</p>}
                    {r.violationId && (
                      <Link
                        href="/dashboard/violations?status=all"
                        className="mt-1 inline-block font-mono text-xs text-emerald-700 hover:underline"
                        title={r.violationId}
                      >
                        violation {r.violationId.slice(0, 8)}
                      </Link>
                    )}
                  </td>
                  <td className="min-w-64 px-6 py-4 font-mono text-xs">
                    <p className="text-slate-900" title={r.eventHash}>
                      {short(r.eventHash)}
                    </p>
                    <p className="mt-1 text-slate-400" title={r.prevHash}>
                      ← {short(r.prevHash)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <VerificationBadge status={r.status} />
                    {r.fabricTxId && (
                      <p className="mt-2 font-mono text-xs text-slate-500" title={r.fabricTxId}>
                        tx {r.fabricTxId.slice(0, 10)}… · block {r.fabricBlock ?? "—"}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
