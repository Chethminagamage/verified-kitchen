import {
  BrainCircuit,
  RadioTower,
} from "lucide-react";

import type {
  Violation,
} from "../../model/violation.model";

import ViolationSeverityBadge from "./ViolationSeverityBadge";

interface ViolationTableProps {
  violations: Violation[];
}

function getStatusStyle(
  status: Violation["status"]
) {
  if (status === "Active") {
    return "bg-red-50 text-red-700";
  }

  if (status === "Acknowledged") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function getBlockchainStyle(
  status: Violation["blockchainStatus"]
) {
  if (status === "Anchored") {
    return "text-emerald-700";
  }

  if (status === "Pending") {
    return "text-amber-700";
  }

  return "text-slate-500";
}

export default function ViolationTable({
  violations,
}: ViolationTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-950">
          Violation History
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          AI and environmental hygiene violations detected
          by the Verified Kitchen monitoring system.
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
                Pillar
              </th>

              <th className="px-6 py-3 font-semibold">
                Source
              </th>

              <th className="px-6 py-3 font-semibold">
                Severity
              </th>

              <th className="px-6 py-3 font-semibold">
                Score Impact
              </th>

              <th className="px-6 py-3 font-semibold">
                Status
              </th>

              <th className="px-6 py-3 font-semibold">
                Audit
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {violations.map((violation) => (
              <tr
                key={violation.id}
                className="text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <td className="min-w-64 px-6 py-4">
                  <p className="font-medium text-slate-950">
                    {violation.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {violation.timestamp}
                  </p>

                  <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
                    {violation.description}
                  </p>
                </td>

                <td className="min-w-44 px-6 py-4">
                  {violation.pillar}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {violation.source === "AI" ? (
                      <BrainCircuit className="h-4 w-4 text-violet-600" />
                    ) : (
                      <RadioTower className="h-4 w-4 text-sky-600" />
                    )}

                    {violation.source}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <ViolationSeverityBadge
                    severity={violation.severity}
                  />
                </td>

                <td className="px-6 py-4">
                  <span className="font-semibold text-red-600">
                    {violation.scoreImpact}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                      violation.status
                    )}`}
                  >
                    {violation.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-semibold ${getBlockchainStyle(
                      violation.blockchainStatus
                    )}`}
                  >
                    {violation.blockchainStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}