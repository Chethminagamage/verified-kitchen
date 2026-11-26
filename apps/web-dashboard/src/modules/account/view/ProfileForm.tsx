"use client";

import { CircleAlert, UserRound } from "lucide-react";
import { useActionState } from "react";

import { describedBy, Field, inputClass } from "@/shared/components/form/Field";
import SubmitButton from "@/shared/components/form/SubmitButton";
import { useActionToast } from "@/shared/components/feedback/Toaster";
import { Panel, PanelFooter, PanelHeader } from "@/shared/components/ui/Panel";

import { updateProfileAction } from "../controller/account.actions";
import { NAME_MAX_LENGTH, type AccountActionState } from "../model/account.model";

interface ProfileFormProps {
  fullName: string | null;
  email: string;
  phone: string | null;
  roleLabel: string;
}

/** The signed-in user's own name and phone number. Email and role are managed by the administrator. */
export default function ProfileForm({ fullName, email, phone, roleLabel }: ProfileFormProps) {
  const [state, action] = useActionState<AccountActionState, FormData>(updateProfileAction, null);
  useActionToast(state);
  const errors = state?.fieldErrors ?? {};

  return (
    <Panel>
      <PanelHeader icon={UserRound} tone="positive" title="My profile" description="How you appear in the console and in records." />

      <form action={action} className="mt-6 space-y-4" noValidate>
        <Field id="profile-name" label="Full name" error={errors.fullName}>
          <input
            id="profile-name"
            name="fullName"
            defaultValue={fullName ?? ""}
            autoComplete="name"
            maxLength={NAME_MAX_LENGTH}
            required
            className={inputClass(errors.fullName)}
            {...describedBy("profile-name", errors.fullName)}
          />
        </Field>

        <Field id="profile-phone" label="Phone number" error={errors.phone} hint="Optional. Used if the platform team needs to reach you.">
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            defaultValue={phone ?? ""}
            autoComplete="tel"
            placeholder="+94 77 123 4567"
            className={inputClass(errors.phone)}
            {...describedBy("profile-phone", errors.phone, "Optional. Used if the platform team needs to reach you.")}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="profile-email" label="Email" hint="Your sign-in name.">
            <input id="profile-email" value={email} readOnly disabled className={inputClass()} aria-describedby="profile-email-hint" />
          </Field>
          <Field id="profile-role" label="Role" hint="Set by the administrator.">
            <input id="profile-role" value={roleLabel} readOnly disabled className={inputClass()} aria-describedby="profile-role-hint" />
          </Field>
        </div>

        {state && !state.ok && (
          <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden /> {state.message}
          </p>
        )}

        <PanelFooter>
          <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
        </PanelFooter>
      </form>
    </Panel>
  );
}
