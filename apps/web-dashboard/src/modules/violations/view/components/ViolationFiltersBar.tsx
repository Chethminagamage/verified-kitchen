"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle, X } from "lucide-react";

import {
  PILLAR_LABELS,
  PILLARS,
  SEVERITIES,
  SOURCE_LABELS,
  SOURCES,
  STATUS_FILTER_LABELS,
  STATUS_FILTERS,
  filtersToQuery,
  type ViolationFilters,
} from "../../model/violation.model";

interface ViolationFiltersBarProps {
  filters: ViolationFilters;
}

const SELECT =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

export default function ViolationFiltersBar({
  filters,
}: ViolationFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const update = (overrides: Partial<ViolationFilters>) => {
    startTransition(() => {
      router.replace(
        `${pathname}${filtersToQuery(filters, { ...overrides, page: 1 })}`,
        { scroll: false }
      );
    });
  };

  const isFiltered =
    filters.status !== "open" || filters.severity || filters.source || filters.pillar;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="filter-status">Status</label>
      <select
        id="filter-status"
        className={SELECT}
        value={filters.status}
        onChange={(e) => update({ status: e.target.value as ViolationFilters["status"] })}
      >
        {STATUS_FILTERS.map((s) => (
          <option key={s} value={s}>{STATUS_FILTER_LABELS[s]}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-severity">Severity</label>
      <select
        id="filter-severity"
        className={SELECT}
        value={filters.severity ?? ""}
        onChange={(e) =>
          update({ severity: (e.target.value || null) as ViolationFilters["severity"] })
        }
      >
        <option value="">All severities</option>
        {SEVERITIES.map((s) => (
          <option key={s} value={s} className="capitalize">{s[0].toUpperCase() + s.slice(1)}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-source">Source</label>
      <select
        id="filter-source"
        className={SELECT}
        value={filters.source ?? ""}
        onChange={(e) =>
          update({ source: (e.target.value || null) as ViolationFilters["source"] })
        }
      >
        <option value="">All sources</option>
        {SOURCES.map((s) => (
          <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="filter-pillar">Pillar</label>
      <select
        id="filter-pillar"
        className={SELECT}
        value={filters.pillar ?? ""}
        onChange={(e) =>
          update({ pillar: (e.target.value || null) as ViolationFilters["pillar"] })
        }
      >
        <option value="">All pillars</option>
        {PILLARS.map((p) => (
          <option key={p} value={p}>{PILLAR_LABELS[p]}</option>
        ))}
      </select>

      {isFiltered && (
        <button
          type="button"
          onClick={() => update({ status: "open", severity: null, source: null, pillar: null })}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
          Clear filters
        </button>
      )}

      {pending && <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" aria-label="Loading" />}
    </div>
  );
}
