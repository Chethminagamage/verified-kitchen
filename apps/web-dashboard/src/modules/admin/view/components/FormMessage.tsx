import { CircleAlert, CircleCheck } from "lucide-react";

import type { ActionState } from "../../model/admin.model";

/** Outcome of the last submit of a form. */
export default function FormMessage({ state, className = "" }: { state: ActionState; className?: string }) {
  if (!state) return null;
  const Icon = state.ok ? CircleCheck : CircleAlert;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
        state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      } ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{state.message}</span>
    </p>
  );
}
