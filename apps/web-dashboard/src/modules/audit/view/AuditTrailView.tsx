import { Blocks, CircleCheck, CircleX, Clock3 } from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";
import PageHeader from "@/shared/components/ui/PageHeader";
import StatTile from "@/shared/components/ui/StatTile";

import type { AuditPage } from "../model/audit.model";

import AuditRecordTable from "./components/AuditRecordTable";
import ChainIntegrityPanel from "./components/ChainIntegrityPanel";

interface AuditTrailViewProps {
  data: AuditPage;
  kitchenId: string;
}

export default function AuditTrailView({ data, kitchenId }: AuditTrailViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Tamper-proof records"
        title="Audit Trail"
        description="Every problem detected and every change to it is recorded permanently. Each record is linked to the one before it, so no record can be changed or removed without it being noticed."
        aside={<LiveRefresh kitchenId={kitchenId} tables={["audit_records"]} />}
      />

      <ChainIntegrityPanel initial={data.chain} timezone={data.timezone} />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Audit records"
          value={data.counts.total}
          icon={Blocks}
          tone="info"
          description="Recorded events for this kitchen."
        />
        <StatTile
          label="Secured"
          value={data.counts.verified}
          icon={CircleCheck}
          tone="positive"
          description="Records confirmed in the independent ledger."
        />
        <StatTile
          label="Waiting to be secured"
          value={data.counts.pending}
          icon={Clock3}
          description="Recorded here and waiting to be confirmed in the independent ledger."
        />
        <StatTile
          label="Securing failed"
          value={data.counts.failed}
          icon={CircleX}
          tone={data.counts.failed > 0 ? "critical" : "neutral"}
          description="Records that could not be confirmed and need attention."
        />
      </section>

      <div className="mt-8">
        <AuditRecordTable records={data.records} total={data.counts.total} timezone={data.timezone} />
      </div>
    </div>
  );
}
