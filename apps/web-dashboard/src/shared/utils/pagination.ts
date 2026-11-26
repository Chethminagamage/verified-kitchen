/** One page of a list, with what the pagination bar needs to describe it. */
export interface Paged<T> {
  items: T[];
  /** 1-based page actually shown (clamped into range). */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based position of the first and last item shown (0 when the list is empty). */
  first: number;
  last: number;
}

/** Reads a `?page=` value: a positive whole number, otherwise page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1;
}

/**
 * Cuts one page out of a list. A page past the end shows the last page
 * (e.g. after live updates shortened the list), never an empty one.
 */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Paged<T> {
  if (pageSize < 1) throw new Error("pageSize must be at least 1");
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: current,
    pageCount,
    total,
    first: total === 0 ? 0 : start + 1,
    last: start + slice.length,
  };
}
