import { ThermometerSun, UsersRound, UtensilsCrossed, type LucideIcon } from "lucide-react";

import AnimatedNumber from "@/shared/components/ui/AnimatedNumber";
import Meter from "@/shared/components/ui/Meter";
import { IconTile, Panel } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";
import { toneForScore } from "@/shared/components/ui/tone";

import type { PillarId, PillarScore } from "../../model/dashboard.model";
import { scoreBand } from "../../model/score-band";

const PILLAR_ICONS: Record<PillarId, LucideIcon> = {
  personal: UsersRound,
  food_prep: UtensilsCrossed,
  environmental: ThermometerSun,
};

/** Why a pillar has no score, in the operator's words. */
const PAUSED_REASON: Record<PillarId, string> = {
  personal: "Paused: the camera is not sending results.",
  food_prep: "Paused: the camera is not sending results.",
  environmental: "Paused: no recent sensor readings.",
};

export default function PillarCard({ pillar }: { pillar: PillarScore }) {
  const tone = toneForScore(pillar.score);

  return (
    <Panel as="article" interactive className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <IconTile icon={PILLAR_ICONS[pillar.id]} tone={pillar.score === null ? "neutral" : "positive"} />
        <StatusPill tone={tone}>{pillar.score === null ? "Paused" : scoreBand(pillar.score)}</StatusPill>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{pillar.name}</p>

      {pillar.score === null ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{PAUSED_REASON[pillar.id]}</p>
      ) : (
        <p className="mt-1 flex items-baseline gap-0.5">
          <AnimatedNumber value={Math.round(pillar.score)} className="text-3xl font-semibold tracking-tight text-slate-950" />
          <span className="text-sm font-medium text-slate-400">%</span>
        </p>
      )}

      <p className="mt-2 text-xs leading-5 text-slate-500">{pillar.description}</p>

      <Meter value={pillar.score} tone={tone} label={`${pillar.name} score`} className="mt-auto pt-0" />
    </Panel>
  );
}
