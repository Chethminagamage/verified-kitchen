"use client";

import { useActionState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { inputClass } from "@/modules/admin/view/components/ui";

import { registerDeviceAction } from "../../controller/kitchens.actions";

export default function RegisterDeviceForm({ kitchenId }: { kitchenId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(registerDeviceAction, null);
  const errors = state?.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-3 border-t border-slate-100 pt-5">
      <input type="hidden" name="kitchen_id" value={kitchenId} />
      <p className="text-sm font-medium text-slate-900">Register a device</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select name="type" aria-label="Device type" defaultValue="" required className={`${inputClass(errors.type)} sm:w-56`}>
          <option value="" disabled>Device type…</option>
          <option value="env_node">Environmental sensor</option>
          <option value="camera">Hygiene camera</option>
        </select>
        <input name="name" aria-label="Device name" required maxLength={80} placeholder="e.g. Prep counter camera"
          className={`${inputClass(errors.name)} sm:flex-1`} />
        <SubmitButton tone="dark" pendingText="Registering...">Register</SubmitButton>
      </div>
      <p className="text-xs text-slate-500">The device gets a permanent ID. Give it to the installer, who uses it to connect the device.</p>
      <FormMessage state={state} />
    </form>
  );
}
