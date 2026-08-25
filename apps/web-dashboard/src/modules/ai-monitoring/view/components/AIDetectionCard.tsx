import {
  CircleCheck,
  CircleAlert,
  BrainCircuit,
} from "lucide-react";

import type {
  AIDetection,
} from "../../model/ai-monitoring.model";

interface AIDetectionCardProps {
  detection: AIDetection;
}

function isPositive(status: AIDetection["status"]) {
  return status === "Compliant" || status === "Clear";
}

export default function AIDetectionCard({
  detection,
}: AIDetectionCardProps) {
  const positive = isPositive(detection.status);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
            <BrainCircuit className="h-4 w-4 text-slate-700" />
          </div>

          <h4 className="mt-3 font-medium text-slate-950">
            {detection.name}
          </h4>
        </div>

        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
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

          {detection.status}
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Confidence
          </span>

          <span className="text-sm font-semibold text-slate-900">
            {detection.confidence}%
          </span>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{
              width: `${detection.confidence}%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Last checked: {detection.lastChecked}
        </p>
      </div>
    </article>
  );
}