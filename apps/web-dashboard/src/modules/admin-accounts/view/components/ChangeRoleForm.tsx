"use client";

import { useActionState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { inputClass } from "@/modules/admin/view/components/ui";

import { changeRoleAction } from "../../controller/accounts.actions";
import { STAFF_ROLE_LABELS, STAFF_ROLES, type StaffRole } from "../../model/accounts.model";

export default function ChangeRoleForm({ userId, role }: { userId: string; role: StaffRole }) {
  const [state, formAction] = useActionState<ActionState, FormData>(changeRoleAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex gap-2">
        <select name="role" defaultValue={role} aria-label="Role" className={`${inputClass(undefined, "h-9")} flex-1`}>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
          ))}
        </select>
        <SubmitButton tone="outline" className="h-9" pendingText="Saving...">Change role</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
