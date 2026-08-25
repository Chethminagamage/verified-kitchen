import type { Metadata } from "next";

import { getSettingsData } from "@/modules/settings/controller/settings.controller";
import SettingsView from "@/modules/settings/view/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const data = await getSettingsData();

  return <SettingsView data={data} />;
}