import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isUuid } from "@/modules/admin/model/admin.model";
import { KitchensService } from "@/modules/admin-kitchens/service/kitchens.service";
import KitchenDetailView from "@/modules/admin-kitchens/view/KitchenDetailView";

export const metadata: Metadata = {
  title: "Kitchen",
};

export default async function AdminKitchenPage({ params, searchParams }: PageProps<"/admin/kitchens/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const kitchen = await new KitchensService().detail(id);
  if (!kitchen) notFound();

  const { created } = await searchParams;
  const timeZones = Intl.supportedValuesOf("timeZone");
  // Keep a kitchen's current zone selectable even if this runtime does not list it.
  if (!timeZones.includes(kitchen.listing.timezone)) timeZones.unshift(kitchen.listing.timezone);

  return <KitchenDetailView kitchen={kitchen} timeZones={timeZones} justCreated={created === "1"} />;
}
