import {
  CircleCheckBig,
  Eye,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";

import { Lock } from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import Notice from "@/shared/components/ui/Notice";
import PageHeader from "@/shared/components/ui/PageHeader";
import StatTile from "@/shared/components/ui/StatTile";

import type { ViolationPage } from "../model/violation.model";

import ViolationFiltersBar from "./components/ViolationFiltersBar";
import ViolationTable from "./components/ViolationTable";

interface ViolationsViewProps {
  page: ViolationPage;
  kitchenId: string;
}

export default function ViolationsView({
  page,
  kitchenId,
}: ViolationsViewProps) {
  const { counts } = page;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Compliance monitoring"
        title="Violations"
        description="Problems detected automatically by the camera and sensors. Every new violation and every status change is written to the tamper-proof record."
        aside={<LiveRefresh kitchenId={kitchenId} tables={["violations"]} />}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active"
          value={counts.active}
          icon={TriangleAlert}
          tone={counts.active > 0 ? "critical" : "neutral"}
          description="Need an operator to acknowledge or resolve them."
        />
        <StatTile
          label="Acknowledged"
          value={counts.acknowledged}
          icon={Eye}
          tone={counts.acknowledged > 0 ? "warning" : "neutral"}
          description="Seen by an operator, not yet resolved."
        />
        <StatTile
          label="Resolved"
          value={counts.resolved}
          icon={CircleCheckBig}
          tone="positive"
          description="Closed incidents in the monitoring history."
        />
        <StatTile
          label="Open high / critical"
          value={counts.openHighSeverity}
          icon={ShieldAlert}
          tone={counts.openHighSeverity > 0 ? "serious" : "neutral"}
          description="Open incidents with high or critical severity."
        />
      </section>

      {!page.canManage && (
        <Notice tone="neutral" icon={Lock} className="mt-6">
          You have read-only access to violations.
        </Notice>
      )}

      <div className="mb-4 mt-8">
        <ViolationFiltersBar filters={page.filters} />
      </div>

      <ViolationTable page={page} />
    </div>
  );
}
