import type { ViolationSeverity } from "../../model/violation.model";

const SEVERITY_STYLES: Record<ViolationSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

interface ViolationSeverityBadgeProps {
  severity: ViolationSeverity;
}

export default function ViolationSeverityBadge({
  severity,
}: ViolationSeverityBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}
