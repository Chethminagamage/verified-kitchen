import type { ReactNode } from "react";

interface PageHeaderProps {
  /** Small coloured line above the title (the page's area). */
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Right-hand side, e.g. the live indicator. */
  aside?: ReactNode;
}

/** The header every console page starts with, so all pages line up the same way. */
export default function PageHeader({ eyebrow, title, description, aside }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-600">{eyebrow}</p>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
        {description && <div className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</div>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </header>
  );
}
