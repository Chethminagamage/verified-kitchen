"use client";

import { useActionState } from "react";
import { LoaderCircle, ShieldAlert, ShieldCheck } from "lucide-react";

import { formatDateTime } from "@/shared/utils/time";

import { verifyChainAction, type VerifyChainState } from "../../controller/audit.actions";
import type { ChainCheck } from "../../model/audit.model";

interface ChainIntegrityPanelProps {
  initial: ChainCheck;
  timezone: string;
}

export default function ChainIntegrityPanel({ initial, timezone }: ChainIntegrityPanelProps) {
  const [state, action, pending] = useActionState<VerifyChainState>(verifyChainAction, null);
  const check = state?.ok ? state.check : initial;
  const Icon = check.intact ? ShieldCheck : ShieldAlert;

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        check.intact ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${check.intact ? "text-emerald-700" : "text-red-700"}`} />
          <div>
            <h3 className={`font-semibold ${check.intact ? "text-emerald-950" : "text-red-950"}`}>
              {check.records === 0
                ? "No audit records yet"
                : check.intact
                  ? `Audit chain intact: all ${check.records} record${check.records === 1 ? "" : "s"} verified`
                  : `Audit chain BROKEN at record #${check.firstProblem?.seq}`}
            </h3>
            <p className={`mt-1 text-sm ${check.intact ? "text-emerald-800" : "text-red-800"}`}>
              {check.intact
                ? "Every record's SHA-256 hash was recomputed from its content and checked against the previous record, back to the first (GENESIS)."
                : `Reason: ${check.firstProblem?.reason}. A record was modified, removed or reordered after it was written.`}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Checked {formatDateTime(check.checkedAt, timezone)} by the database (verify_audit_chain).
            </p>
          </div>
        </div>

        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify chain now
          </button>
        </form>
      </div>

      {state && !state.ok && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </section>
  );
}
