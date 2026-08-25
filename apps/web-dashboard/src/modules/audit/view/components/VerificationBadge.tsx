import {
  CircleCheck,
  Clock3,
  CircleX,
} from "lucide-react";

import type {
  AuditVerificationStatus,
} from "../../model/audit.model";

interface VerificationBadgeProps {
  status: AuditVerificationStatus;
}

export default function VerificationBadge({
  status,
}: VerificationBadgeProps) {
  if (status === "Verified") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CircleCheck className="h-4 w-4" />
        Verified
      </span>
    );
  }

  if (status === "Pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        <Clock3 className="h-4 w-4" />
        Pending
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      <CircleX className="h-4 w-4" />
      Failed
    </span>
  );
}