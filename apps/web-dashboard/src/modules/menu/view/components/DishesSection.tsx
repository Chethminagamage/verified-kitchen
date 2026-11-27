"use client";

import { Plus, UtensilsCrossed } from "lucide-react";
import { useCallback, useState } from "react";

import { buttonClass } from "@/shared/components/form/button-styles";
import EmptyState from "@/shared/components/ui/EmptyState";
import { Panel } from "@/shared/components/ui/Panel";
import SectionHeader from "@/shared/components/ui/SectionHeader";

import type { MenuCategory, MenuDish } from "../../model/menu.model";
import DishDialog from "./DishDialog";
import DishRow from "./DishRow";

interface DishesSectionProps {
  kitchenId: string;
  categories: MenuCategory[];
  canManage: boolean;
}

/** The menu by category, with "Add dish" and the add / edit dialog. */
export default function DishesSection({ kitchenId, categories, canManage }: DishesSectionProps) {
  // undefined = dialog closed, null = adding, a dish = editing it.
  const [editing, setEditing] = useState<MenuDish | null | undefined>(undefined);
  const close = useCallback(() => setEditing(undefined), []);
  const categoryNames = categories.map((c) => c.name);

  return (
    <section className="mt-10">
      <SectionHeader
        eyebrow="Menu"
        title="Dishes"
        description="Prices, photos and what is available right now. Changes show in the app straight away."
        aside={
          canManage ? (
            <button type="button" onClick={() => setEditing(null)} className={buttonClass("primary", "sm")}>
              <Plus className="h-4 w-4" aria-hidden /> Add dish
            </button>
          ) : undefined
        }
      />

      {categories.length === 0 ? (
        <Panel>
          <EmptyState icon={UtensilsCrossed} title="No dishes yet">
            Add your first dish to start taking orders.
          </EmptyState>
        </Panel>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <Panel key={category.name}>
              <h3 className="text-base font-semibold tracking-tight text-slate-950">
                {category.name}{" "}
                <span className="font-normal text-slate-500">· {category.dishes.length}</span>
              </h3>
              <ul className="mt-1 divide-y divide-slate-100">
                {category.dishes.map((dish) => (
                  <DishRow key={dish.id} dish={dish} kitchenId={kitchenId} canManage={canManage} onEdit={setEditing} />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <DishDialog key={editing?.id ?? "new"} dish={editing} categories={categoryNames} onClose={close} />
      )}
    </section>
  );
}
