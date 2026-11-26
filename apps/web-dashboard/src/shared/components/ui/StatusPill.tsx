import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { TONES, type Tone } from "./tone";

const DEFAULT_ICONS: Record<Tone, LucideIcon> = {
  positive: CircleCheck,
  warning: CircleAlert,
  serious: CircleAlert,
  critical: CircleX,
  neutral: CircleDashed,
  info: Info,
};

interface StatusPillProps {
  tone: Tone;
  children: ReactNode;
  /** Replaces the tone's default icon; `null` shows a dot instead. */
  icon?: LucideIcon | null;
  size?: "sm" | "md";
  className?: string;
}

/** The one status badge used across the console. Colour always comes from the tone. */
export default function StatusPill({ tone, children, icon, size = "sm", className = "" }: StatusPillProps) {
  const t = TONES[tone];
  const Icon = icon === undefined ? DEFAULT_ICONS[tone] : icon;
  const sizing = size === "md" ? "gap-2 px-3 py-1 text-sm" : "gap-1.5 px-2.5 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset ${sizing} ${t.pill} ${className}`}
    >
      {Icon ? (
        <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden />
      )}
      {children}
    </span>
  );
}
