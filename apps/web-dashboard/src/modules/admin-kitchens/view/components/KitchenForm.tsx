"use client";

import { useActionState } from "react";

import type { ActionState } from "@/modules/admin/model/admin.model";
import FormMessage from "@/modules/admin/view/components/FormMessage";
import SubmitButton from "@/modules/admin/view/components/SubmitButton";
import { describedBy, Field, inputClass } from "@/modules/admin/view/components/ui";

import { createKitchenAction, updateKitchenAction } from "../../controller/kitchens.actions";
import type { KitchenListing } from "../../model/kitchens.model";

interface KitchenFormProps {
  /** Present when editing an existing kitchen. */
  kitchenId?: string;
  initial: KitchenListing;
  timeZones: string[];
  /** A live kitchen must keep its cuisine and description. */
  live?: boolean;
}

export default function KitchenForm({ kitchenId, initial, timeZones, live }: KitchenFormProps) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    kitchenId ? updateKitchenAction : createKitchenAction,
    null
  );
  const errors = state?.fieldErrors ?? {};
  const required = Boolean(live);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {kitchenId && <input type="hidden" name="kitchen_id" value={kitchenId} />}

      <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
        <Field id="name" label="Kitchen name" error={errors.name}>
          <input id="name" name="name" defaultValue={initial.name} required maxLength={80}
            className={inputClass(errors.name)} {...describedBy("name", errors.name)} />
        </Field>
        <Field id="emoji" label="Emoji" error={errors.emoji} hint="Shown in the app">
          <input id="emoji" name="emoji" defaultValue={initial.emoji} maxLength={8} placeholder="🍛"
            className={inputClass(errors.emoji)} {...describedBy("emoji", errors.emoji, "Shown in the app")} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="location" label="Location" error={errors.location} hint="Area or city, e.g. Kandy">
          <input id="location" name="location" defaultValue={initial.location} maxLength={120}
            className={inputClass(errors.location)} {...describedBy("location", errors.location, "Area or city, e.g. Kandy")} />
        </Field>
        <Field id="cuisine" label="Cuisine" error={errors.cuisine} hint={required ? "Required while live" : "Needed to go live"}>
          <input id="cuisine" name="cuisine" defaultValue={initial.cuisine} maxLength={60} required={required}
            placeholder="Sri Lankan · Rice & curry" className={inputClass(errors.cuisine)}
            {...describedBy("cuisine", errors.cuisine, "hint")} />
        </Field>
      </div>

      <Field id="description" label="Description" error={errors.description}
        hint="One or two sentences customers see on the kitchen's page (500 characters at most).">
        <textarea id="description" name="description" defaultValue={initial.description} maxLength={500} rows={3}
          required={required} className={inputClass(errors.description, "py-2.5")}
          {...describedBy("description", errors.description, "hint")} />
      </Field>

      <fieldset className="rounded-2xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Opening hours</legend>
        <p className="mb-4 text-xs leading-5 text-slate-500">
          Customers can order only while the kitchen is open, and the hygiene rating checks that monitoring
          covered these hours. Same opening and closing time means open 24 hours; a closing time before the
          opening time means open overnight.
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="opens_at" label="Opens" error={errors.opens_at}>
            <input id="opens_at" name="opens_at" type="time" defaultValue={initial.opensAt} required
              className={inputClass(errors.opens_at)} {...describedBy("opens_at", errors.opens_at)} />
          </Field>
          <Field id="closes_at" label="Closes" error={errors.closes_at}>
            <input id="closes_at" name="closes_at" type="time" defaultValue={initial.closesAt} required
              className={inputClass(errors.closes_at)} {...describedBy("closes_at", errors.closes_at)} />
          </Field>
          <Field id="timezone" label="Time zone" error={errors.timezone}>
            <select id="timezone" name="timezone" defaultValue={initial.timezone}
              className={inputClass(errors.timezone)} {...describedBy("timezone", errors.timezone)}>
              {timeZones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="delivery_fee_lkr" label="Delivery fee (LKR)" error={errors.delivery_fee_lkr}>
          <input id="delivery_fee_lkr" name="delivery_fee_lkr" type="number" min={0} max={5000} step="0.01"
            defaultValue={initial.deliveryFeeLkr} required className={inputClass(errors.delivery_fee_lkr)}
            {...describedBy("delivery_fee_lkr", errors.delivery_fee_lkr)} />
        </Field>
        <Field id="prep_minutes" label="Typical preparation time (minutes)" error={errors.prep_minutes}>
          <input id="prep_minutes" name="prep_minutes" type="number" min={5} max={180} step={1}
            defaultValue={initial.prepMinutes} required className={inputClass(errors.prep_minutes)}
            {...describedBy("prep_minutes", errors.prep_minutes)} />
        </Field>
      </div>

      <FormMessage state={state} />

      <div className="flex justify-end">
        <SubmitButton pendingText={kitchenId ? "Saving..." : "Creating..."}>
          {kitchenId ? "Save listing" : "Create kitchen"}
        </SubmitButton>
      </div>
    </form>
  );
}
