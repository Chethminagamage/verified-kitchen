import {
  CircleCheckBig,
  UsersRound,
  UtensilsCrossed,
  ThermometerSun,
} from "lucide-react";

interface PillarCardProps {
  name: string;
  score: number;
  description: string;
}

function getIcon(name: string) {
  if (name === "Personal Hygiene") {
    return UsersRound;
  }

  if (name === "Food Preparation") {
    return UtensilsCrossed;
  }

  return ThermometerSun;
}

export default function PillarCard({
  name,
  score,
  description,
}: PillarCardProps) {
  const Icon = getIcon(name);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>

        <CircleCheckBig className="h-5 w-5 text-emerald-500" />
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

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </article>
  );
}