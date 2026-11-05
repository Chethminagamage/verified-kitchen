import Link from "next/link";

import { formatDateTime } from "@/shared/utils/time";

import type { AuditRecordView } from "../../model/audit.model";

import VerificationBadge from "./VerificationBadge";

function short(hash: string): string {
  return hash === "GENESIS" ? "GENESIS" : `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

interface AuditRecordTableProps {
  records: AuditRecordView[];
  total: number;
  timezone: string;
}

export default function AuditRecordTable({ records, total, timezone }: AuditRecordTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-950">Audit Records</h3>
        <p className="mt-1 text-sm text-slate-500">
          {total === 0
            ? "Records appear when the edge service raises a violation or an operator changes one."
            : `Newest first${total > records.length ? ` · showing the latest ${records.length} of ${total}` : ""}. Written by database triggers; records cannot be edited or deleted.`}
        </p>
      </div>

      {records.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3 font-semibold">#</th>
                <th className="px-6 py-3 font-semibold">Event</th>
                <th className="px-6 py-3 font-semibold">Hash chain</th>
                <th className="px-6 py-3 font-semibold">Blockchain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id} className="align-top text-sm text-slate-700">
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
    </section>
  );
}
