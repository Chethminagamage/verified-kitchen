import { CircleCheck, CircleX, Clock3, type LucideIcon } from "lucide-react";

import StatusPill from "@/shared/components/ui/StatusPill";
import type { Tone } from "@/shared/components/ui/tone";

import { AUDIT_STATUS_LABELS, type AuditStatus } from "../../model/audit.model";

/** "Waiting to be secured" is normal until the independent ledger is connected, so it is neutral. */
const STYLES: Record<AuditStatus, { tone: Tone; icon: LucideIcon }> = {
  verified: { tone: "positive", icon: CircleCheck },
  pending: { tone: "neutral", icon: Clock3 },
  failed: { tone: "critical", icon: CircleX },
};

export default function VerificationBadge({ status }: { status: AuditStatus }) {
  const style = STYLES[status];
  return (
    <StatusPill tone={style.tone} icon={style.icon}>
      {AUDIT_STATUS_LABELS[status]}
    </StatusPill>
  );
}
