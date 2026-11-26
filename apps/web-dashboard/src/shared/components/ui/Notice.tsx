import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { TONES, type Tone } from "./tone";

interface NoticeProps {
  tone: Tone;
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** A page-level message (offline camera, stale data...), in the tone's colours. */
export default function Notice({ tone, icon: Icon, title, children, className = "" }: NoticeProps) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "critical" || tone === "warning" ? "status" : undefined}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${t.border} ${t.soft} ${t.text} ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.icon}`} aria-hidden />
      <div className="leading-6">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
