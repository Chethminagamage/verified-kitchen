"use client";

import { useActionState, useState } from "react";
import { Check, CheckCheck, LoaderCircle } from "lucide-react";

import { changeViolationStatusAction } from "../../controller/violation.actions";
import {
  allowedTransitions,
  type ViolationActionState,
  type ViolationStatus,
} from "../../model/violation.model";

interface ViolationRowActionsProps {
  id: string;
  status: ViolationStatus;
  title: string;
}

export default function ViolationRowActions({
  id,
  status,
  title,
}: ViolationRowActionsProps) {
  const [state, formAction, pending] = useActionState<ViolationActionState, FormData>(
    changeViolationStatusAction,
    null
  );
  const [confirmResolve, setConfirmResolve] = useState(false);
  const transitions = allowedTransitions(status);

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={id} />

        {transitions.includes("acknowledged") && !confirmResolve && (
          <button
            type="submit"
            name="status"
            value="acknowledged"
            disabled={pending}
            aria-label={`Acknowledge: ${title}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Acknowledge
          </button>
        )}

        {confirmResolve ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmResolve(false)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              name="status"
              value="resolved"
              disabled={pending}
              aria-label={`Confirm resolve: ${title}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {pending ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Confirm resolve
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmResolve(true)}
            aria-label={`Resolve: ${title}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            {pending ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Resolve
          </button>
        )}
      </form>

      {state && !state.ok && (
        <p role="alert" className="max-w-56 text-right text-xs text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
