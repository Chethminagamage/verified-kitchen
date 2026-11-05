import { Blocks, CircleCheck, CircleX, Clock3 } from "lucide-react";

import LiveRefresh from "@/shared/components/feedback/LiveRefresh";

import type { AuditPage } from "../model/audit.model";

import AuditRecordTable from "./components/AuditRecordTable";
import AuditSummaryCard from "./components/AuditSummaryCard";
import ChainIntegrityPanel from "./components/ChainIntegrityPanel";

interface AuditTrailViewProps {
  data: AuditPage;
  kitchenId: string;
}

export default function AuditTrailView({ data, kitchenId }: AuditTrailViewProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-600">Tamper-Evident Audit Layer</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Audit Trail</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Every violation and every status change is appended to a SHA-256 hash chain in the database. The
            hashes will be anchored on Hyperledger Fabric so that even a database administrator cannot rewrite
            history unnoticed.
          </p>
        </div>
        <LiveRefresh kitchenId={kitchenId} tables={["audit_records"]} />
      </div>

      <ChainIntegrityPanel initial={data.chain} timezone={data.timezone} />

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AuditSummaryCard
          label="Audit records"
          value={data.counts.total}
          icon={Blocks}
          description="Events in the hash chain for this kitchen."
        />
        <AuditSummaryCard
          label="Anchored"
          value={data.counts.verified}
          icon={CircleCheck}
          description="Hashes confirmed on Hyperledger Fabric."
        />
        <AuditSummaryCard
          label="Pending anchor"
          value={data.counts.pending}
          icon={Clock3}
          description="Waiting for the Fabric anchoring service (not connected yet)."
        />
        <AuditSummaryCard
          label="Anchor failed"
          value={data.counts.failed}
          icon={CircleX}
          description="Anchoring attempts that need attention."
        />
      </section>

      <div className="mt-8">
        <AuditRecordTable records={data.records} total={data.counts.total} timezone={data.timezone} />
      </div>
    </div>
  );
}
