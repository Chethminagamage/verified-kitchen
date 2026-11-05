import {
  BrainCircuit,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  RadioTower,
  type LucideIcon,
} from "lucide-react";

import LiveAge from "@/shared/components/feedback/LiveAge";

import type { CheckStatus, HygieneCheck } from "../../model/hygiene.model";

const STATUS: Record<CheckStatus, { className: string; icon: LucideIcon }> = {
  Compliant: { className: "bg-emerald-50 text-emerald-700", icon: CircleCheck },
  Safe: { className: "bg-emerald-50 text-emerald-700", icon: CircleCheck },
  Warning: { className: "bg-amber-50 text-amber-700", icon: CircleAlert },
  "Non-Compliant": { className: "bg-red-50 text-red-700", icon: CircleX },
  Critical: { className: "bg-red-50 text-red-700", icon: CircleX },
  "No evidence": { className: "bg-slate-100 text-slate-500", icon: CircleDashed },
  "No data": { className: "bg-slate-100 text-slate-500", icon: CircleDashed },
};

interface HygieneCheckCardProps {
  check: HygieneCheck;
  generatedAt: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

export default function HygieneCheckCard({ check, generatedAt }: HygieneCheckCardProps) {
  const status = STATUS[check.status];
  const StatusIcon = status.icon;
  const range = check.safeRange;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{check.name}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            {check.source === "AI" ? <BrainCircuit className="h-4 w-4" /> : <RadioTower className="h-4 w-4" />}
            {check.source === "AI" ? "AI (camera)" : "Sensor (ESP32)"}
          </div>
        </div>

        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {check.status}
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        {check.source === "AI" ? (
          <>
            <Row
              label="Compliance (last minute)"
              value={check.compliancePct === null ? "—" : `${Math.round(check.compliancePct)}%`}
            />
            <Row
              label="Model confidence"
              value={check.confidence === null ? "—" : `${Math.round(check.confidence * 100)}%`}
            />
          </>
        ) : (
          <>
            <Row
              label="Current reading"
              value={check.value === null ? "—" : `${check.value.toFixed(check.decimals)} ${check.unit ?? ""}`}
            />
            {range && (
              <Row
                label="Safe range"
                value={
                  range.min !== null && range.max !== null
                    ? `${range.min}–${range.max} ${check.unit ?? ""}`
                    : range.max !== null
                      ? `≤ ${range.max} ${check.unit ?? ""}`
                      : `≥ ${range.min} ${check.unit ?? ""}`
                }
              />
            )}
          </>
        )}

        <p className="pt-1 text-xs text-slate-400">
          Last checked:{" "}
          {check.lastChecked ? <LiveAge iso={check.lastChecked} serverNow={generatedAt} /> : "never"}
        </p>
      </div>
    </article>
  );
}
