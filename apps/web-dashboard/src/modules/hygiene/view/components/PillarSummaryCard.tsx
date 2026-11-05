import { ThermometerSun, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";

import { scoreBand } from "@/modules/dashboard/model/score-band";

import type { HygienePillar, PillarId } from "../../model/hygiene.model";

const PILLAR_ICONS: Record<PillarId, LucideIcon> = {
  personal: UsersRound,
  food_prep: UtensilsCrossed,
  environmental: ThermometerSun,
};

const BAR = { Excellent: "bg-emerald-500", Good: "bg-emerald-500", Moderate: "bg-amber-500", Poor: "bg-red-500" };

interface PillarSummaryCardProps {
  pillar: HygienePillar;
}

export default function PillarSummaryCard({ pillar }: PillarSummaryCardProps) {
  const Icon = PILLAR_ICONS[pillar.id];
  const band = pillar.score === null ? null : scoreBand(pillar.score);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {band ?? "No evidence"}
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{pillar.name}</p>

      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-bold text-slate-950">
          {pillar.score === null ? "—" : Math.round(pillar.score)}
        </span>
        {pillar.score !== null && <span className="pb-1 text-sm font-medium text-slate-400">%</span>}
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${band ? BAR[band] : "bg-slate-300"}`}
          style={{ width: `${pillar.score ?? 0}%` }}
        />
      </div>
    </article>
  );
}
