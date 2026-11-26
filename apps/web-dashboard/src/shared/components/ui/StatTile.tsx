import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile, Panel } from "./Panel";
import type { Tone } from "./tone";

interface StatTileProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  description?: string;
  tone?: Tone;
}

/** A headline number with its label and a short explanation (summary rows on each page). */
export default function StatTile({ label, value, icon, description, tone = "neutral" }: StatTileProps) {
  return (
    <Panel as="article" interactive>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-slate-950">{value}</p>
        </div>
        <IconTile icon={icon} tone={tone} />
      </div>
      {description && <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>}
    </Panel>
  );
}
