import { PANEL_CLASS } from "./Panel";

/** Shimmering placeholder block shown while a page loads. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--color-slate-100)_0%,var(--color-slate-200)_50%,var(--color-slate-100)_100%)] bg-[length:200%_100%] ${className}`}
    />
  );
}

/** Generic page placeholder: header, a row of tiles and two panels. Used by loading.tsx. */
export function PageSkeleton({ tiles = 3 }: { tiles?: number }) {
  return (
    <div className="mx-auto max-w-7xl" role="status" aria-label="Loading">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${tiles >= 3 ? "xl:grid-cols-3" : ""}`}>
        {Array.from({ length: tiles }, (_, i) => (
          <div key={i} className={`${PANEL_CLASS} space-y-4 p-6`}>
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className={`${PANEL_CLASS} p-6`}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-56 w-full" />
        </div>
        <div className={`${PANEL_CLASS} space-y-4 p-6`}>
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
