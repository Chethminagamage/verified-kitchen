import type { Metadata } from "next";

import { getCurrentSession } from "@/modules/auth/controller/auth.query";
import { getSettingsData } from "@/modules/settings/controller/settings.controller";
import SettingsView from "@/modules/settings/view/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const session = await getCurrentSession();

  // The layout handles signed-out users and users without a kitchen.
  if (!session?.kitchen) {
    return null;
  }

  const data = await getSettingsData(session);

  return <SettingsView data={data} />;
}
