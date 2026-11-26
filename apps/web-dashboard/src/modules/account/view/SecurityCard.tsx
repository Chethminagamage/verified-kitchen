"use client";

import { CircleAlert, LogOut, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";

import { SESSION_MAX_AGE_MS } from "@/modules/auth/model/auth.model";
import { buttonClass } from "@/shared/components/form/button-styles";
import SubmitButton from "@/shared/components/form/SubmitButton";
import { useActionToast } from "@/shared/components/feedback/Toaster";
import { Panel, PanelFooter, PanelHeader } from "@/shared/components/ui/Panel";

import { signOutOtherDevicesAction } from "../controller/account.actions";
import type { AccountActionState } from "../model/account.model";

interface SecurityCardProps {
  /** When this device signed in (shown as a local date and time). */
  signedInLabel: string;
}

/** Session security: when this device signed in, and ending the sessions on every other device. */
export default function SecurityCard({ signedInLabel }: SecurityCardProps) {
  const [state, action] = useActionState<AccountActionState, FormData>(signOutOtherDevicesAction, null);
  const [confirming, setConfirming] = useState(false);
  useActionToast(state);

  // Leave the confirmation step once the result arrives (not on submit, so the button can show progress).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    setConfirming(false);
  }

  return (
    <Panel>
      <PanelHeader icon={ShieldCheck} tone="positive" title="Security" description="Where you are signed in." />

      <dl className="mt-5 divide-y divide-slate-100 text-sm">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-slate-500">This device signed in</dt>
          <dd className="font-medium text-slate-900">{signedInLabel}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-slate-500">Automatic sign-out</dt>
          <dd className="text-right font-medium text-slate-900">
            When the browser closes, or after {SESSION_MAX_AGE_MS / 3_600_000} hours
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
        <p className="text-sm font-medium text-slate-900">Sign out other devices</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Ends your sessions on every other computer, tablet or phone, for example a shared kitchen computer or a lost
          device. This device stays signed in.
        </p>
      </div>

      {state && !state.ok && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-red-600">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden /> {state.message}
        </p>
      )}

      <form action={action}>
        <PanelFooter>
          {confirming ? (
            <>
              <span className="mr-auto text-sm text-slate-600">Sign out every other device?</span>
              <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost")}>
                Cancel
              </button>
              <SubmitButton tone="danger" pendingText="Signing out…">
                <LogOut className="h-4 w-4" aria-hidden /> Sign them out
              </SubmitButton>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={buttonClass("outline")}>
              <LogOut className="h-4 w-4" aria-hidden /> Sign out other devices
            </button>
          )}
        </PanelFooter>
      </form>
    </Panel>
  );
}
