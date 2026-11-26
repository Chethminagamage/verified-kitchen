import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONES, type Tone } from "./tone";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  tone?: Tone;
  /** Smaller version for use inside a card. */
  compact?: boolean;
  className?: string;
}

/**
 * Explains why there is nothing to show (and what to do), instead of
 * leaving dashes behind. Used for offline devices, empty lists and paused checks.
 */
export default function EmptyState({ icon: Icon, title, children, tone = "neutral", compact = false, className = "" }: EmptyStateProps) {
  const t = TONES[tone];
  return (
    <div
      className={`flex flex-col items-center text-center ${compact ? "gap-2 px-3 py-5" : "gap-3 px-6 py-10"} ${className}`}
    >
      <span
        className={`flex items-center justify-center rounded-full ${t.soft} ${compact ? "h-9 w-9" : "h-12 w-12"}`}
        aria-hidden
      >
        <Icon className={`${t.icon} ${compact ? "h-4 w-4" : "h-6 w-6"}`} />
      </span>
      <div>
        <p className={`font-semibold text-slate-800 ${compact ? "text-sm" : "text-base"}`}>{title}</p>
        {children && (
          <p className={`mx-auto mt-1 max-w-md leading-6 text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>{children}</p>
        )}
      </div>
    </div>
  );
}
