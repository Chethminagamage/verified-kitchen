import type { Metadata } from "next";

import { KitchensService } from "@/modules/admin-kitchens/service/kitchens.service";
import KitchensListView from "@/modules/admin-kitchens/view/KitchensListView";

export const metadata: Metadata = {
  title: "Kitchens",
};

export default async function AdminKitchensPage() {
  const kitchens = await new KitchensService().list();
  return <KitchensListView kitchens={kitchens} />;
}
