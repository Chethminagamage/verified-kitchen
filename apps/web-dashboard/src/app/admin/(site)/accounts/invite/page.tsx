import type { Metadata } from "next";

import { isUuid } from "@/modules/admin/model/admin.model";
import { KitchensService } from "@/modules/admin-kitchens/service/kitchens.service";
import InviteView from "@/modules/admin-accounts/view/InviteView";

export const metadata: Metadata = {
  title: "Invite staff",
};

export default async function InviteStaffPage({ searchParams }: PageProps<"/admin/accounts/invite">) {
  const { kitchen } = await searchParams;
  const kitchens = await new KitchensService().options();
  const preselected = typeof kitchen === "string" && isUuid(kitchen) && kitchens.some((k) => k.id === kitchen) ? kitchen : null;
  return <InviteView kitchens={kitchens} defaultKitchenId={preselected} />;
}
