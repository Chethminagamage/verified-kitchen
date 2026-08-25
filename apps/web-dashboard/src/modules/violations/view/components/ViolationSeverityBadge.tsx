import type {
  ViolationSeverity,
} from "../../model/violation.model";

interface ViolationSeverityBadgeProps {
  severity: ViolationSeverity;
}

function getSeverityStyle(
  severity: ViolationSeverity
) {
  switch (severity) {
    case "Critical":
      return "bg-red-100 text-red-800";

    case "High":
      return "bg-orange-100 text-orange-800";

    case "Medium":
      return "bg-amber-100 text-amber-800";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function ViolationSeverityBadge({
  severity,
}: ViolationSeverityBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getSeverityStyle(
        severity
      )}`}
    >
      {severity}
    </span>
  );
}