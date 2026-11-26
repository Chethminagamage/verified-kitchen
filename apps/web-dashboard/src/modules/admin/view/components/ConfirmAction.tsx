"use client";

import { useActionState, useState } from "react";

import type { ActionState } from "../../model/admin.model";

import FormMessage from "./FormMessage";
import LinkPanel from "./LinkPanel";
import SubmitButton from "./SubmitButton";

type Tone = "primary" | "dark" | "danger" | "outline" | "outline-danger";

/**
 * A button that runs an admin Server Action, optionally after a confirmation
 * step, and shows the result (and any one-time link) underneath.
 */
export default function ConfirmAction({
  action,
  fields,
  label,
  pendingText,
  confirm,
  confirmLabel,
  tone = "outline",
  confirmTone = "danger",
  disabled,
  small,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingText?: string;
  /** Question shown before running; omit to run on the first click. */
  confirm?: string;
  confirmLabel?: string;
  tone?: Tone;
  confirmTone?: Tone;
  disabled?: boolean;
  small?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(async (previous, formData) => {
    const result = await action(previous, formData);
    setAsking(false);
    return result;
  }, null);
  const size = small ? "h-8 px-3 text-xs" : "";

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        {confirm && !asking ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAsking(true)}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              tone === "primary"
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : tone === "outline-danger"
                  ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
                  : tone === "danger"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : tone === "dark"
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } ${size}`}
          >
            {label}
          </button>
        ) : confirm ? (
          <>
            <span className="text-sm text-slate-600">{confirm}</span>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Cancel
            </button>
            <SubmitButton tone={confirmTone} pendingText={pendingText} className={size}>
              {confirmLabel ?? label}
            </SubmitButton>
          </>
        ) : (
          <SubmitButton tone={tone} pendingText={pendingText} disabled={disabled} className={size}>
            {label}
          </SubmitButton>
        )}
      </form>
      {state && !state.link && <FormMessage state={state} />}
      {state?.link && <LinkPanel link={state.link} />}
    </div>
  );
}
