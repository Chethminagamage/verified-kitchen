"use client";

import { CircleAlert, Eye, EyeOff, KeyRound } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { PASSWORD_MIN_LENGTH } from "@/modules/auth/model/setup.model";
import { describedBy, Field, inputClass } from "@/shared/components/form/Field";
import SubmitButton from "@/shared/components/form/SubmitButton";
import { useActionToast } from "@/shared/components/feedback/Toaster";
import { buttonClass } from "@/shared/components/form/button-styles";
import { Panel, PanelFooter, PanelHeader } from "@/shared/components/ui/Panel";

import { changePasswordAction } from "../controller/account.actions";
import type { AccountActionState, AccountField } from "../model/account.model";

const NEW_HINT = `At least ${PASSWORD_MIN_LENGTH} characters. A short sentence is easy to remember and hard to guess.`;

function PasswordInput({
  id,
  name,
  autoComplete,
  error,
  hint,
  visible,
}: {
  id: string;
  name: AccountField;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: string;
  visible: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      required
      className={inputClass(error)}
      {...describedBy(id, error, hint)}
    />
  );
}

/** Change the password; the current one is checked first so an unattended screen cannot be misused. */
export default function ChangePasswordForm() {
  const [state, action] = useActionState<AccountActionState, FormData>(changePasswordAction, null);
  const [visible, setVisible] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useActionToast(state);
  const errors = state?.fieldErrors ?? {};

  // Never leave passwords in the form after a successful change.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <Panel>
      <PanelHeader
        icon={KeyRound}
        tone="info"
        title="Change password"
        description="You will stay signed in on this device."
        aside={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className={buttonClass("ghost", "sm")}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" aria-hidden /> : <Eye className="h-3.5 w-3.5" aria-hidden />}
            {visible ? "Hide" : "Show"} passwords
          </button>
        }
      />

      <form ref={form} action={action} className="mt-6 space-y-4" noValidate>
        <Field id="pw-current" label="Current password" error={errors.currentPassword}>
          <PasswordInput id="pw-current" name="currentPassword" autoComplete="current-password" error={errors.currentPassword} visible={visible} />
        </Field>
        <Field id="pw-new" label="New password" error={errors.newPassword} hint={NEW_HINT}>
          <PasswordInput id="pw-new" name="newPassword" autoComplete="new-password" error={errors.newPassword} hint={NEW_HINT} visible={visible} />
        </Field>
        <Field id="pw-confirm" label="Confirm new password" error={errors.confirmPassword}>
          <PasswordInput id="pw-confirm" name="confirmPassword" autoComplete="new-password" error={errors.confirmPassword} visible={visible} />
        </Field>

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            name="signOutOthers"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Sign out of all other devices after changing it
        </label>

        {state && !state.ok && (
          <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden /> {state.message}
          </p>
        )}

        <PanelFooter>
          <SubmitButton pendingText="Changing…">Change password</SubmitButton>
        </PanelFooter>
      </form>
    </Panel>
  );
}
