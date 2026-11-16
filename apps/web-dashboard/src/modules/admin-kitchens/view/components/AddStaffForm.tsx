"use client";

import { useActionState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { inputClass } from "@/modules/admin/view/components/ui";

import { setStaffAccessAction } from "../../controller/kitchens.actions";

export interface StaffOption {
  userId: string;
  label: string;
}

/** Give an existing operator or inspector access to this kitchen. */
export default function AddStaffForm({ kitchenId, options }: { kitchenId: string; options: StaffOption[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(setStaffAccessAction, null);
  if (options.length === 0) return null;
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="kitchen_id" value={kitchenId} />
      <input type="hidden" name="linked" value="true" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <select name="user_id" defaultValue="" aria-label="Existing staff member" required
          className={`${inputClass(state?.fieldErrors?.user_id)} sm:flex-1`}>
          <option value="" disabled>Add existing staff…</option>
          {options.map((o) => (
            <option key={o.userId} value={o.userId}>{o.label}</option>
          ))}
        </select>
        <SubmitButton tone="dark" pendingText="Adding...">Give access</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
