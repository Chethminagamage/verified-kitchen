"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { changeOrderStatusAction } from "../../controller/orders.actions";
import { nextActions, type OrderActionState, type OrderStatus } from "../../model/orders.model";

interface OrderActionsProps {
  id: string;
  reference: string;
  status: OrderStatus;
}

export default function OrderActions({ id, reference, status }: OrderActionsProps) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(changeOrderStatusAction, null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const actions = nextActions(status);
  if (actions.length === 0) return null;

  const primary = actions.find((a) => a.tone === "primary");
  const cancel = actions.find((a) => a.tone === "danger");

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="from" value={status} />

        {confirmCancel && cancel ? (
          <>
            <span className="text-sm text-slate-600">{cancel.label} order {reference}?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmCancel(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Keep
            </button>
            <button
              type="submit"
              name="to"
              value={cancel.to}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {cancel.label}
            </button>
          </>
        ) : (
          <>
            {primary && (
              <button
                type="submit"
                name="to"
                value={primary.to}
                disabled={pending}
                aria-label={`${primary.label}: order ${reference}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {primary.label}
              </button>
            )}
            {cancel && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmCancel(true)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                {cancel.label}
              </button>
            )}
          </>
        )}
      </form>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
