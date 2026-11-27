import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getMenuPage } from "@/modules/menu/controller/menu.controller";
import MenuView from "@/modules/menu/view/MenuView";
import { canSeeKitchenPages } from "@/shared/components/layout/navigation";

export const metadata: Metadata = {
  title: "Menu",
};

export default async function MenuPage() {
  const session = await getCurrentSession();
  const kitchen = session?.kitchen;

  // The layout handles signed-out users, customers and users without a kitchen.
  if (!session || !kitchen) {
    return null;
  }
  // The menu is the kitchen's business, not part of a hygiene inspection.
  if (!canSeeKitchenPages(session.role)) notFound();

  return <MenuView data={await getMenuPage(session, kitchen)} />;
}
