"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";

import { setupAccountAction } from "../../controller/setup.actions";
import { PASSWORD_MIN_LENGTH, type SetupLink, type SetupState } from "../../model/setup.model";

export default function SetupPasswordForm({ link }: { link: SetupLink }) {
  const [state, formAction, pending] = useActionState<SetupState, FormData>(setupAccountAction, null);
  const invalid = state?.field === "password";

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <input type="hidden" name="token_hash" value={link.tokenHash} />
      <input type="hidden" name="type" value={link.type} />

      {state && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {(["password", "confirm"] as const).map((name) => (
        <div key={name}>
          <label htmlFor={name} className="text-sm font-medium text-slate-700">
            {name === "password" ? "New password" : "Repeat the password"}
          </label>
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={name}
              name={name}
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              aria-invalid={invalid || undefined}
              aria-describedby={name === "password" ? "password-hint" : undefined}
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          {name === "password" && (
            <p id="password-hint" className="mt-1.5 text-xs text-slate-500">
              At least {PASSWORD_MIN_LENGTH} characters. A short sentence is easy to remember and hard to guess.
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {pending ? "Saving..." : "Save password and sign in"}
      </button>
    </form>
  );
}
