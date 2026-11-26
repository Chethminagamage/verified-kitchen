"use client";

import { useActionState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { inputClass } from "@/modules/admin/view/components/ui";

import { renameDeviceAction } from "../../controller/kitchens.actions";

export default function RenameDeviceForm({ deviceId, name }: { deviceId: string; name: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(renameDeviceAction, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="device_id" value={deviceId} />
      <div className="flex gap-2">
        <input name="name" defaultValue={name} aria-label={`New name for ${deviceId}`} required maxLength={80}
          className={`${inputClass(undefined, "h-9")} flex-1`} />
        <SubmitButton tone="outline" className="h-9" pendingText="Saving...">Rename</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
