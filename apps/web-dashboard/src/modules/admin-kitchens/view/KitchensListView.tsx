import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import { EmptyState, PageHeader, Pill } from "@/modules/admin/view/components/ui";
import { formatDateTime } from "@/shared/utils/time";

import type { KitchenSummary } from "../model/kitchens.model";

import { RatingPill } from "./components/RatingPill";

export default function KitchensListView({ kitchens }: { kitchens: KitchenSummary[] }) {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Onboarding"
        title="Kitchens"
        description="Every kitchen on the platform. A new kitchen stays hidden from the app until its monitoring devices, operator and menu are in place and you put it live."
        actions={
          <Link href="/admin/kitchens/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" />
            New kitchen
          </Link>
        }
      />

      {kitchens.length === 0 ? (
        <EmptyState>No kitchens yet. Create the first one.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Kitchen</th>
                <th className="px-5 py-3 font-semibold">In the app</th>
                <th className="px-5 py-3 font-semibold">Public rating</th>
                <th className="px-5 py-3 font-semibold">Devices reporting</th>
                <th className="px-5 py-3 font-semibold">Operators</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {kitchens.map((k) => (
                <tr key={k.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <Link href={`/admin/kitchens/${k.id}`} className="flex items-center gap-3 font-medium text-slate-900 hover:text-emerald-700">
                      <span aria-hidden className="text-xl">{k.emoji ?? "🍽️"}</span>
                      <span>
                        {k.name}
                        <span className="block font-mono text-xs font-normal text-slate-400">{k.code}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    {k.isPublic ? <Pill tone="green">Live</Pill> : <Pill tone="slate">Hidden</Pill>}
                  </td>
                  <td className="px-5 py-4"><RatingPill rating={k.rating} /></td>
                  <td className="px-5 py-4">
                    {k.devicesTotal === 0 ? (
                      <span className="text-slate-400">None</span>
                    ) : (
                      <span className={k.devicesReporting < k.devicesTotal ? "font-medium text-amber-700" : ""}>
                        {k.devicesReporting} of {k.devicesTotal}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">{k.operators || <span className="text-slate-400">None</span>}</td>
                  <td className="px-5 py-4 text-slate-500">{formatDateTime(k.createdAt, PLATFORM_TIMEZONE)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/kitchens/${k.id}`} aria-label={`Open ${k.name}`} className="inline-flex text-slate-400 hover:text-emerald-600">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
