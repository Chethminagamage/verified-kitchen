"use client";

import { X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { useActionToast } from "@/shared/components/feedback/Toaster";
import { describedBy, Field, inputClass } from "@/shared/components/form/Field";
import SubmitButton from "@/shared/components/form/SubmitButton";
import { buttonClass } from "@/shared/components/form/button-styles";

import { saveDishAction } from "../../controller/menu.actions";
import {
  CATEGORY_MAX,
  DISH_DESCRIPTION_MAX,
  DISH_NAME_MAX,
  type MenuActionState,
  type MenuDish,
} from "../../model/menu.model";

interface DishDialogProps {
  /** The dish to edit, or null to add a new one. */
  dish: MenuDish | null;
  categories: string[];
  onClose: () => void;
}

/**
 * Add or edit a dish in a modal (the browser's <dialog>: focus is kept inside
 * and Escape closes it). Photos are added from the dish's row after saving.
 */
export default function DishDialog({ dish, categories, onClose }: DishDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<MenuActionState, FormData>(saveDishAction, null);
  useActionToast(state);
  const errors = state?.fieldErrors ?? {};

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // Close once the dish is saved.
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const title = dish ? `Edit ${dish.name}` : "Add a dish";

  return (
    <dialog
      ref={ref}
      aria-labelledby="dish-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()} // click on the backdrop
      className="m-auto w-[min(36rem,calc(100vw_-_2rem))] rounded-2xl bg-white p-0 shadow-card-hover backdrop:bg-slate-950/40"
    >
      <form action={action} noValidate className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 id="dish-dialog-title" className="text-lg font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("ghost", "sm")} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {dish && <input type="hidden" name="id" value={dish.id} />}
        <div className="mt-5 grid gap-4 sm:grid-cols-6">
          <Field id="dish-name" label="Name" error={errors.name} className="sm:col-span-4">
            <input
              id="dish-name"
              name="name"
              defaultValue={dish?.name}
              maxLength={DISH_NAME_MAX}
              autoFocus
              required
              className={inputClass(errors.name)}
              {...describedBy("dish-name", errors.name)}
            />
          </Field>
          <Field id="dish-price" label="Price (LKR)" error={errors.price} className="sm:col-span-2">
            <input
              id="dish-price"
              name="price"
              inputMode="decimal"
              defaultValue={dish?.priceLkr}
              placeholder="950"
              required
              className={inputClass(errors.price)}
              {...describedBy("dish-price", errors.price)}
            />
          </Field>
          <Field
            id="dish-description"
            label="Description"
            error={errors.description}
            hint="What is in it, in a few words."
            className="sm:col-span-6"
          >
            <textarea
              id="dish-description"
              name="description"
              defaultValue={dish?.description ?? ""}
              maxLength={DISH_DESCRIPTION_MAX}
              rows={2}
              className={inputClass(errors.description, "py-2.5")}
              {...describedBy("dish-description", errors.description, "What is in it, in a few words.")}
            />
          </Field>
          <Field id="dish-category" label="Category" error={errors.category} hint="For example Rice & curry, Drinks." className="sm:col-span-4">
            <input
              id="dish-category"
              name="category"
              list="dish-categories"
              defaultValue={dish?.category}
              maxLength={CATEGORY_MAX}
              className={inputClass(errors.category)}
              {...describedBy("dish-category", errors.category, "For example Rice & curry, Drinks.")}
            />
            <datalist id="dish-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="dish-emoji" label="Emoji" error={errors.emoji} hint="Shown until a photo is added." className="sm:col-span-2">
            <input
              id="dish-emoji"
              name="emoji"
              defaultValue={dish?.emoji ?? "🍽️"}
              maxLength={8}
              className={inputClass(errors.emoji)}
              {...describedBy("dish-emoji", errors.emoji, "Shown until a photo is added.")}
            />
          </Field>
          {!dish && (
            <label className="flex items-center gap-2.5 text-sm text-slate-700 sm:col-span-6">
              <input type="hidden" name="isAvailable" value="off" />
              <input
                type="checkbox"
                name="isAvailable"
                value="on"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Available to order now
            </label>
          )}
        </div>

        {state && !state.ok && !state.fieldErrors && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {state.message}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("ghost")}>
            Cancel
          </button>
          <SubmitButton pendingText="Saving…">{dish ? "Save changes" : "Add dish"}</SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
