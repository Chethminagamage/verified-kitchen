import { ShieldCheck } from "lucide-react";
import type { HygieneStatus } from "../../model/dashboard.model";

interface HygieneScoreCardProps {
  score: number;
  status: HygieneStatus;
  lastUpdated: string;
}

export default function HygieneScoreCard({
  score,
  status,
  lastUpdated,
}: HygieneScoreCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Overall Hygiene Score
          </p>

          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-bold tracking-tight text-slate-950">
              {score}
            </span>

            <span className="pb-1 text-lg font-medium text-slate-400">
              / 100
            </span>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            {status}
          </div>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Last updated: {lastUpdated}
        </p>
      </div>
    </section>
  );
}