import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  first: number;
  last: number;
  /** Link for a page number (keeps the page's other query parameters). */
  hrefFor: (page: number) => string;
  /** What is being counted, e.g. "checks". */
  noun?: string;
}

const BUTTON =
  "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50";
const DISABLED = "inline-flex items-center gap-1 rounded-lg border border-slate-100 px-2.5 py-1.5 text-slate-300";

/**
 * Previous / next bar under a table. Pages are links (`?page=n`), so they work
 * without JavaScript, survive live refreshes and can be bookmarked.
 */
export default function Pagination({ page, pageCount, total, first, last, hrefFor, noun }: PaginationProps) {
  if (total === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm text-slate-500 sm:px-6"
    >
      <p className="tabular-nums">
        {first}–{last} of {total}
        {noun && ` ${noun}`}
      </p>

      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} scroll={false} className={BUTTON} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
          </Link>
        ) : (
          <span className={DISABLED} aria-disabled>
            <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
          </span>
        )}

        <span className="px-1 tabular-nums">
          Page {page} of {pageCount}
        </span>

        {page < pageCount ? (
          <Link href={hrefFor(page + 1)} scroll={false} className={BUTTON} aria-label="Next page">
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span className={DISABLED} aria-disabled>
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
