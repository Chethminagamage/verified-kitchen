import type { ReactNode } from "react";

/*
 * Form field building blocks shared by the operator console and the admin site:
 * a labelled control with its hint or error, wired up for screen readers.
 */

const INPUT =
  "w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50";

export function inputClass(error?: string, extra = "h-11") {
  return `${INPUT} ${extra} ${error ? "border-red-300" : "border-slate-200"}`;
}

/** Label + control + hint/error, wired up for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export function describedBy(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
