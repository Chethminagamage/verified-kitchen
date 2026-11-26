import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONES, type Tone } from "./tone";

/** Card surface shared by every panel, tile and table in the console. */
export const PANEL_CLASS = "rounded-2xl border border-slate-200/80 bg-white shadow-card";

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Adds the default inner spacing (turn off for tables that run edge to edge). */
  padded?: boolean;
  /** Lifts slightly on hover; for cards that summarise something clickable or live. */
  interactive?: boolean;
  as?: "section" | "article" | "div";
}

export function Panel({ children, className = "", padded = true, interactive = false, as: Tag = "section" }: PanelProps) {
  const hover = interactive ? "transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover" : "";
  return <Tag className={`${PANEL_CLASS} ${padded ? "p-5 sm:p-6" : ""} ${hover} ${className}`}>{children}</Tag>;
}

interface PanelHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Tone of the icon tile (defaults to neutral). */
  tone?: Tone;
  /** Right-hand side: a status pill, score or action. */
  aside?: ReactNode;
  className?: string;
}

/** Title row of a panel: optional icon tile, title, description and a right-hand slot. */
export function PanelHeader({ title, description, icon: Icon, tone = "neutral", aside, className = "" }: PanelHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${className}`}>
      {/* flex-1 keeps a short status (the aside) on the title's line, even with a long description. */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon && <IconTile icon={Icon} tone={tone} />}
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
          {description && <p className="mt-0.5 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
      </div>
      {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
    </div>
  );
}

/** Rounded square holding an icon, tinted by tone. */
export function IconTile({ icon: Icon, tone = "neutral", size = "md" }: { icon: LucideIcon; tone?: Tone; size?: "md" | "lg" }) {
  const t = TONES[tone];
  const box = size === "lg" ? "h-12 w-12 rounded-xl" : "h-10 w-10 rounded-xl";
  const glyph = size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${t.soft}`}>
      <Icon className={`${glyph} ${t.icon}`} aria-hidden />
    </span>
  );
}

/** The bottom row of a card: a divider, then the card's actions on the right. */
export function PanelFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4 ${className}`}>
      {children}
    </div>
  );
}
