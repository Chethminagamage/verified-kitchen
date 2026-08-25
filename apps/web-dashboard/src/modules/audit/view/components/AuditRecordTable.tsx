import {
  Blocks,
  Fingerprint,
} from "lucide-react";

import type {
  AuditRecord,
} from "../../model/audit.model";

import VerificationBadge from "./VerificationBadge";

interface AuditRecordTableProps {
  records: AuditRecord[];
}

function shortenHash(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-8)}`;
}

export default function AuditRecordTable({
  records,
}: AuditRecordTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Blockchain Audit Records
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Important hygiene events selected for tamper-aware
          audit logging.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="px-6 py-3 font-semibold">
                Event
              </th>

              <th className="px-6 py-3 font-semibold">
                Violation
              </th>

              <th className="px-6 py-3 font-semibold">
                Event Hash
              </th>

              <th className="px-6 py-3 font-semibold">
                Transaction
              </th>

              <th className="px-6 py-3 font-semibold">
                Block
              </th>

              <th className="px-6 py-3 font-semibold">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr
                key={record.id}
                className="text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <td className="min-w-72 px-6 py-4">
                  <p className="font-medium text-slate-950">
                    {record.eventType}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {record.timestamp}
                  </p>

                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                    {record.description}
                  </p>
                </td>

                <td className="whitespace-nowrap px-6 py-4">
                  {record.violationId ?? "—"}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-slate-400" />

                    <code className="text-xs text-slate-600">
                      {shortenHash(record.eventHash)}
                    </code>
                  </div>
                </td>

                <td className="px-6 py-4">
                  {record.transactionId ? (
                    <div className="flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-violet-600" />

                      <code className="text-xs text-slate-600">
                        {record.transactionId}
                      </code>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Waiting
                    </span>
                  )}
                </td>

                <td className="px-6 py-4">
                  {record.blockNumber ?? "—"}
                </td>

                <td className="px-6 py-4">
                  <VerificationBadge
                    status={record.verificationStatus}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}