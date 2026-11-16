import { Card, PageHeader } from "@/modules/admin/view/components/ui";

import type { ActivityEntry } from "../model/activity.model";

import ActivityList from "./ActivityList";

export default function ActivityView({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Accountability"
        title="Activity log"
        description="Every change made on the admin site, with who made it and when. Entries are written by the database itself and cannot be edited or deleted. Showing the latest 200."
      />
      <Card>
        <ActivityList entries={entries} />
      </Card>
    </div>
  );
}
