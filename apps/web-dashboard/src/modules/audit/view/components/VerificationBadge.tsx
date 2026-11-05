import { CircleCheck, CircleX, Clock3, type LucideIcon } from "lucide-react";

import { AUDIT_STATUS_LABELS, type AuditStatus } from "../../model/audit.model";

const STYLES: Record<AuditStatus, { className: string; icon: LucideIcon }> = {
  verified: { className: "bg-emerald-50 text-emerald-700", icon: CircleCheck },
  pending: { className: "bg-amber-50 text-amber-700", icon: Clock3 },
  failed: { className: "bg-red-50 text-red-700", icon: CircleX },
};

interface VerificationBadgeProps {
  status: AuditStatus;
}

export default function VerificationBadge({ status }: VerificationBadgeProps) {
  const style = STYLES[status];
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {AUDIT_STATUS_LABELS[status]}
    </span>
  );
}
