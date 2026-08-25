import {
  UsersRound,
  UtensilsCrossed,
  ThermometerSun,
} from "lucide-react";

interface PillarSummaryCardProps {
  name: string;
  score: number;
}

function getPillarIcon(name: string) {
  if (name === "Personal Hygiene") {
    return UsersRound;
  }

  if (name === "Food Preparation Hygiene") {
    return UtensilsCrossed;
  }

  return ThermometerSun;
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Good";
  if (score >= 70) return "Moderate";
  return "Needs Attention";
}

export default function PillarSummaryCard({
  name,
  score,
}: PillarSummaryCardProps) {
  const Icon = getPillarIcon(name);
  const label = getScoreLabel(score);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {name}
      </p>

      <div className="mt-1 flex items-end gap-1">
        <span className="text-3xl font-bold text-slate-950">
          {score}
        </span>

        <span className="pb-1 text-sm font-medium text-slate-400">
          %
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </article>
  );
}