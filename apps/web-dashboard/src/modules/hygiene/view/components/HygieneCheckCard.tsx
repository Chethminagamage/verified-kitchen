import {
  BrainCircuit,
  CircleCheck,
  CircleAlert,
  RadioTower,
} from "lucide-react";

import type {
  HygieneCheck,
} from "../../model/hygiene.model";

interface HygieneCheckCardProps {
  check: HygieneCheck;
}

function isPositive(status: HygieneCheck["status"]) {
  return status === "Compliant" || status === "Safe";
}

export default function HygieneCheckCard({
  check,
}: HygieneCheckCardProps) {
  const positive = isPositive(check.status);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            {check.name}
          </p>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            {check.source === "AI" ? (
              <BrainCircuit className="h-4 w-4" />
            ) : (
              <RadioTower className="h-4 w-4" />
            )}

            {check.source} Monitoring
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            positive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {positive ? (
            <CircleCheck className="h-4 w-4" />
          ) : (
            <CircleAlert className="h-4 w-4" />
          )}

          {check.status}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {check.source === "AI" && check.confidence !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Detection confidence
            </span>

            <span className="text-sm font-semibold text-slate-900">
              {check.confidence}%
            </span>
          </div>
        )}

        {check.source === "Sensor" &&
          check.value !== undefined &&
          check.unit && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Current reading
              </span>

              <span className="text-lg font-bold text-slate-900">
                {check.value}
                <span className="ml-1 text-sm font-medium text-slate-500">
                  {check.unit}
                </span>
              </span>
            </div>
          )}

        <p className="mt-3 text-xs text-slate-400">
          Last checked: {check.lastChecked}
        </p>
      </div>
    </article>
  );
}