"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";

import { useToast } from "@/shared/components/feedback/Toaster";
import { buttonClass } from "@/shared/components/form/button-styles";
import StatusPill from "@/shared/components/ui/StatusPill";
import { formatLkr } from "@/shared/utils/money";

import { deleteDishAction, setAvailabilityAction, setDishPhotoAction } from "../../controller/menu.actions";
import { DISH_PHOTO_SIZE, dishPhotoPath, type MenuActionState, type MenuDish } from "../../model/menu.model";
import PhotoPicker from "./PhotoPicker";

interface DishRowProps {
  dish: MenuDish;
  kitchenId: string;
  canManage: boolean;
  onEdit: (dish: MenuDish) => void;
}

/** One dish: photo, details, availability switch and actions. */
export default function DishRow({ dish, kitchenId, canManage, onEdit }: DishRowProps) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const toast = useToast();

  function run(action: (s: MenuActionState, f: FormData) => Promise<MenuActionState>, fields: Record<string, string>) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, v);
    startTransition(async () => {
      const result = await action(null, form);
      toast({ tone: result?.ok ? "positive" : "critical", message: result?.message ?? "Something went wrong." });
    });
  }

  function removePhoto() {
    startTransition(async () => {
      const result = await setDishPhotoAction(dish.id, null);
      toast({ tone: result?.ok ? "positive" : "critical", message: result?.message ?? "Could not remove the photo." });
    });
  }

  return (
    <li className={`flex flex-col gap-4 py-4 sm:flex-row sm:items-center ${pending ? "opacity-60" : ""}`}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {dish.imageUrl ? (
            <Image src={dish.imageUrl} alt={dish.name} fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl" aria-hidden>
              {dish.emoji}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-slate-950">{dish.name}</h4>
            {!dish.isAvailable && <StatusPill tone="warning">Sold out</StatusPill>}
            {!dish.imageUrl && <StatusPill tone="neutral">No photo</StatusPill>}
          </div>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-slate-700">{formatLkr(dish.priceLkr)}</p>
          {dish.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{dish.description}</p>}
        </div>
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <PhotoPicker
            label={`${dish.imageUrl ? "Replace the photo of" : "Add a photo of"} ${dish.name}`}
            makePath={(stamp) => dishPhotoPath(kitchenId, dish.id, stamp)}
            size={DISH_PHOTO_SIZE}
            save={(path) => setDishPhotoAction(dish.id, path)}
            disabled={pending}
          >
            {dish.imageUrl ? "Replace photo" : "Add photo"}
          </PhotoPicker>
          {dish.imageUrl && (
            <button type="button" onClick={removePhoto} disabled={pending} className={buttonClass("ghost", "sm")}>
              Remove photo
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={dish.isAvailable}
            aria-label={`${dish.name} available to order`}
            disabled={pending}
            onClick={() => run(setAvailabilityAction, { id: dish.id, available: String(!dish.isAvailable) })}
            className={buttonClass(dish.isAvailable ? "outline" : "primary", "sm")}
          >
            {dish.isAvailable ? "Mark sold out" : "Back on menu"}
          </button>
          <button
            type="button"
            onClick={() => onEdit(dish)}
            disabled={pending}
            className={buttonClass("ghost", "sm")}
            aria-label={`Edit ${dish.name}`}
          >
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </button>
          {confirmingDelete ? (
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              Remove?
              <button
                type="button"
                onClick={() => run(deleteDishAction, { id: dish.id })}
                disabled={pending}
                className={buttonClass("danger", "sm")}
              >
                Yes, remove
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className={buttonClass("ghost", "sm")}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={pending}
              className={buttonClass("ghost", "sm")}
              aria-label={`Remove ${dish.name} from the menu`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
