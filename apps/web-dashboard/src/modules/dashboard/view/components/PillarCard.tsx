import {
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  CircleX,
  ThermometerSun,
  UsersRound,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type { PillarId, PillarScore } from "../../model/dashboard.model";
import { scoreBand } from "../../model/score-band";

const PILLAR_ICONS: Record<PillarId, LucideIcon> = {
  personal: UsersRound,
  food_prep: UtensilsCrossed,
  environmental: ThermometerSun,
};

function statusFor(score: number | null): {
  icon: LucideIcon;
  label: string;
  iconClass: string;
  barClass: string;
} {
  if (score === null) {
    return { icon: CircleDashed, label: "No data", iconClass: "text-slate-400", barClass: "bg-slate-300" };
  }

  const band = scoreBand(score);

  if (band === "Excellent" || band === "Good") {
    return { icon: CircleCheckBig, label: band, iconClass: "text-emerald-500", barClass: "bg-emerald-500" };
  }

  if (band === "Moderate") {
    return { icon: CircleAlert, label: band, iconClass: "text-amber-500", barClass: "bg-amber-500" };
  }

  return { icon: CircleX, label: band, iconClass: "text-red-500", barClass: "bg-red-500" };
}

interface PillarCardProps {
  pillar: PillarScore;
}

export default function PillarCard({
  pillar,
}: PillarCardProps) {
  const PillarIcon = PILLAR_ICONS[pillar.id];
  const status = statusFor(pillar.score);
  const StatusIcon = status.icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <PillarIcon className="h-5 w-5 text-slate-700" />
        </div>

        <StatusIcon
          className={`h-5 w-5 ${status.iconClass}`}
          aria-label={status.label}
        />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {pillar.name}
      </p>

      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-bold text-slate-950">
          {pillar.score === null ? "—" : Math.round(pillar.score)}
        </span>

        {pillar.score !== null && (
          <span className="pb-1 text-sm font-medium text-slate-400">
            %
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {pillar.description}
      </p>

      <div
        className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="meter"
        aria-label={`${pillar.name} score`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pillar.score ?? undefined}
      >
        <div
          className={`h-full rounded-full ${status.barClass}`}
          style={{ width: `${pillar.score ?? 0}%` }}
        />
      </div>
    </article>
  );
}
