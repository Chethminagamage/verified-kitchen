"use client";

import { Store, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState, useTransition } from "react";

import { useActionToast, useToast } from "@/shared/components/feedback/Toaster";
import { describedBy, Field, inputClass } from "@/shared/components/form/Field";
import SubmitButton from "@/shared/components/form/SubmitButton";
import { buttonClass } from "@/shared/components/form/button-styles";
import { Panel, PanelFooter, PanelHeader } from "@/shared/components/ui/Panel";

import { saveListingAction, setBannerAction } from "../../controller/menu.actions";
import {
  BANNER_SIZE,
  bannerPhotoPath,
  LISTING_DESCRIPTION_MAX,
  type KitchenListing,
  type MenuActionState,
} from "../../model/menu.model";
import PhotoPicker from "./PhotoPicker";

/** The kitchen as customers see it in the app: banner, what it serves, hours and delivery. */
export default function ListingCard({ listing, canManage }: { listing: KitchenListing; canManage: boolean }) {
  const [state, action] = useActionState<MenuActionState, FormData>(saveListingAction, null);
  const [removing, startRemoving] = useTransition();
  const toast = useToast();
  useActionToast(state);
  const errors = state?.fieldErrors ?? {};

  function removeBanner() {
    startRemoving(async () => {
      const result = await setBannerAction(null);
      toast({ tone: result?.ok ? "positive" : "critical", message: result?.message ?? "Could not remove the banner." });
    });
  }

  return (
    <Panel>
      <PanelHeader
        icon={Store}
        tone="positive"
        title="Your listing in the app"
        description="The banner and details customers see before they order."
      />

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-slate-200 bg-emerald-50">
            {listing.bannerUrl ? (
              <Image
                src={listing.bannerUrl}
                alt={`Banner of ${listing.name}`}
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <span className="text-5xl" aria-hidden>
                  {listing.emoji}
                </span>
                <span className="text-xs text-slate-500">No banner yet: customers see your emoji.</span>
              </div>
            )}
          </div>
          {canManage && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PhotoPicker
                label={listing.bannerUrl ? "Replace the banner" : "Upload a banner"}
                makePath={(stamp) => bannerPhotoPath(listing.kitchenId, stamp)}
                size={BANNER_SIZE}
                save={(path) => setBannerAction(path)}
              >
                {listing.bannerUrl ? "Replace banner" : "Upload banner"}
              </PhotoPicker>
              {listing.bannerUrl && (
                <button type="button" onClick={removeBanner} disabled={removing} className={buttonClass("ghost", "sm")}>
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove
                </button>
              )}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">A wide photo of your food or kitchen. It is cropped to 16:9.</p>
        </div>

        <form action={action} noValidate>
          <fieldset disabled={!canManage} className="grid gap-4 sm:grid-cols-6">
            <Field id="listing-cuisine" label="What you serve" error={errors.cuisine} className="sm:col-span-4">
              <input
                id="listing-cuisine"
                name="cuisine"
                defaultValue={listing.cuisine}
                maxLength={60}
                placeholder="Sri Lankan · Rice & curry"
                className={inputClass(errors.cuisine)}
                {...describedBy("listing-cuisine", errors.cuisine)}
              />
            </Field>
            <Field id="listing-emoji" label="Emoji" error={errors.emoji} className="sm:col-span-2">
              <input
                id="listing-emoji"
                name="emoji"
                defaultValue={listing.emoji}
                maxLength={8}
                className={inputClass(errors.emoji)}
                {...describedBy("listing-emoji", errors.emoji)}
              />
            </Field>
            <Field
              id="listing-description"
              label="Description"
              error={errors.listingDescription}
              hint="One or two sentences about your kitchen."
              className="sm:col-span-6"
            >
              <textarea
                id="listing-description"
                name="listingDescription"
                defaultValue={listing.description}
                maxLength={LISTING_DESCRIPTION_MAX}
                rows={2}
                className={inputClass(errors.listingDescription, "py-2.5")}
                {...describedBy("listing-description", errors.listingDescription, "One or two sentences about your kitchen.")}
              />
            </Field>
            <Field id="listing-opens" label="Opens" error={errors.opensAt} className="sm:col-span-2">
              <input
                id="listing-opens"
                name="opensAt"
                type="time"
                defaultValue={listing.opensAt}
                className={inputClass(errors.opensAt)}
                {...describedBy("listing-opens", errors.opensAt)}
              />
            </Field>
            <Field id="listing-closes" label="Closes" error={errors.closesAt} className="sm:col-span-2">
              <input
                id="listing-closes"
                name="closesAt"
                type="time"
                defaultValue={listing.closesAt}
                className={inputClass(errors.closesAt)}
                {...describedBy("listing-closes", errors.closesAt)}
              />
            </Field>
            <Field id="listing-prep" label="Preparation (min)" error={errors.prepMinutes} className="sm:col-span-2">
              <input
                id="listing-prep"
                name="prepMinutes"
                type="number"
                min={5}
                max={180}
                defaultValue={listing.prepMinutes}
                className={inputClass(errors.prepMinutes)}
                {...describedBy("listing-prep", errors.prepMinutes)}
              />
            </Field>
            <Field id="listing-fee" label="Delivery fee (LKR)" error={errors.deliveryFee} className="sm:col-span-3">
              <input
                id="listing-fee"
                name="deliveryFee"
                inputMode="decimal"
                defaultValue={listing.deliveryFeeLkr}
                className={inputClass(errors.deliveryFee)}
                {...describedBy("listing-fee", errors.deliveryFee)}
              />
            </Field>
          </fieldset>
          {state && !state.ok && !state.fieldErrors && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {state.message}
            </p>
          )}
          {canManage && (
            <PanelFooter>
              <SubmitButton pendingText="Saving…">Save listing</SubmitButton>
            </PanelFooter>
          )}
        </form>
      </div>
    </Panel>
  );
}
