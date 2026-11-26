import type { ReactNode } from "react";

/** The box every chart tooltip is drawn in, so all charts' hovers look the same. */
export function ChartTooltipCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-44 rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-xs shadow-card-hover backdrop-blur">
      <p className="mb-1.5 font-medium text-slate-900">{title}</p>
      {children}
    </div>
  );
}

/** One "swatch, label, value" row inside a tooltip or legend. */
export function SeriesRow({ color, label, value }: { color: string; label: string; value?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <SeriesKey color={color} />
      <span className="flex-1">{label}</span>
      {value !== undefined && <span className="font-semibold tabular-nums text-slate-900">{value}</span>}
    </div>
  );
}

/** Short line swatch identifying a series (legends and tooltips). */
export function SeriesKey({ color }: { color: string }) {
  return <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}
