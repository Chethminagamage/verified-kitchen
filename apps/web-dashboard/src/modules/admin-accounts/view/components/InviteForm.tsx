"use client";

import { useActionState, useState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import LinkPanel from "@/modules/admin/view/components/LinkPanel";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { describedBy, Field, inputClass } from "@/modules/admin/view/components/ui";

import { inviteStaffAction } from "../../controller/accounts.actions";
import { STAFF_ROLE_LABELS, STAFF_ROLES, type StaffRole } from "../../model/accounts.model";

export default function InviteForm({
  kitchens,
  defaultKitchenId,
}: {
  kitchens: { id: string; name: string; code: string }[];
  defaultKitchenId: string | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(inviteStaffAction, null);
  const [role, setRole] = useState<StaffRole>("operator");
  const errors = state?.fieldErrors ?? {};

  if (state?.ok && state.link) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <LinkPanel link={state.link} />
        <p className="text-sm text-slate-500">
          When they open it they choose a password and land in{" "}
          {role === "admin" ? "the admin site" : "their kitchen's console"}. Lost the link? Create a new one from Staff
          accounts.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="full_name" label="Full name" error={errors.full_name}>
          <input id="full_name" name="full_name" required maxLength={100} autoComplete="off"
            className={inputClass(errors.full_name)} {...describedBy("full_name", errors.full_name)} />
        </Field>
        <Field id="email" label="Email" error={errors.email} hint="Their sign-in name. Use a work address, not one used in the customer app.">
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="off"
            className={inputClass(errors.email)} {...describedBy("email", errors.email, "hint")} />
        </Field>
      </div>

      <Field id="role" label="Role" error={errors.role}>
        <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as StaffRole)}
          className={inputClass(errors.role)} {...describedBy("role", errors.role)}>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
          ))}
        </select>
      </Field>

      {role === "admin" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Administrators can change every kitchen and account on the platform. Invite only people who run the platform.
        </p>
      ) : (
        <Field id="kitchen_id" label="Kitchen" error={errors.kitchen_id}>
          <select id="kitchen_id" name="kitchen_id" defaultValue={defaultKitchenId ?? ""} required
            className={inputClass(errors.kitchen_id)} {...describedBy("kitchen_id", errors.kitchen_id)}>
            <option value="" disabled>Choose a kitchen…</option>
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>{k.name} ({k.code})</option>
            ))}
          </select>
        </Field>
      )}

      <FormMessage state={state} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs leading-5 text-slate-500">
          No email is sent: you get a one-time link to pass on (WhatsApp, SMS or email).
        </p>
        <SubmitButton pendingText="Inviting...">Create invitation</SubmitButton>
      </div>
    </form>
  );
}
