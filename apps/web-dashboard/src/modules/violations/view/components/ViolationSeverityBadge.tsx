import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForStatus } from "@/shared/components/ui/tone";

import type { ViolationSeverity } from "../../model/violation.model";

const LABELS: Record<ViolationSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/** Severity of a violation, in the console's shared status colours. */
export default function ViolationSeverityBadge({ severity }: { severity: ViolationSeverity }) {
  return (
    <StatusPill tone={toneForStatus(severity)} icon={null}>
      {LABELS[severity]}
    </StatusPill>
  );
}
