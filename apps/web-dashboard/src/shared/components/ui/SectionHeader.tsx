import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  /** Shown after the title, e.g. "82/100". */
  meta?: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}

/** Heading for a group of cards inside a page (smaller than the page header). */
export default function SectionHeader({ eyebrow, title, meta, description, aside }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">{eyebrow}</p>}
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
          {title}
          {meta && <span className="ml-2 text-sm font-medium text-slate-500">{meta}</span>}
        </h3>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {aside}
    </div>
  );
}
