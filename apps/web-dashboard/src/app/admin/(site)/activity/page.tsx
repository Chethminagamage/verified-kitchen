import type { Metadata } from "next";

import { ActivityService } from "@/modules/admin-activity/service/activity.service";
import ActivityView from "@/modules/admin-activity/view/ActivityView";

export const metadata: Metadata = {
  title: "Activity log",
};

export default async function AdminActivityPage() {
  const entries = await new ActivityService().latest(200);
  return <ActivityView entries={entries} />;
}
