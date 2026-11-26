import type { Metadata } from "next";

import NewKitchenView from "@/modules/admin-kitchens/view/NewKitchenView";

export const metadata: Metadata = {
  title: "New kitchen",
};

export default function NewKitchenPage() {
  return <NewKitchenView timeZones={Intl.supportedValuesOf("timeZone")} />;
}
