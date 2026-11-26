import { CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";

import { Card } from "@/modules/admin/view/components/ui";

import type { ReadinessItem } from "../../model/kitchens.model";

/** The database's go-live checklist (public.kitchen_readiness). */
/** Plain wording for steps whose database text names the hardware. */
const TODO_DETAIL: Record<string, string> = {
  env_node: "Register the environmental sensor.",
  camera: "Register the hygiene camera.",
};

export default function ReadinessCard({ items, live }: { items: ReadinessItem[]; live: boolean }) {
  const done = items.filter((i) => i.blocking && i.ok).length;
  const total = items.filter((i) => i.blocking).length;
  return (
    <Card
      title="Go-live checklist"
      description={live ? "This kitchen is live. These checks keep it ready." : `${done} of ${total} required steps done.`}
    >
      <ul className="space-y-3">
        {items.map((i) => {
          const Icon = i.ok ? CircleCheck : i.blocking ? CircleDashed : TriangleAlert;
          const color = i.ok ? "text-emerald-600" : i.blocking ? "text-slate-400" : "text-amber-500";
          return (
            <li key={i.item} className="flex items-start gap-3">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-hidden />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {i.label}
                  <span className="sr-only">{i.ok ? ": done" : i.blocking ? ": to do" : ": warning"}</span>
                  {!i.blocking && <span className="ml-2 text-xs font-normal text-slate-400">recommended</span>}
                </p>
                <p className="text-xs leading-5 text-slate-500">{(!i.ok && TODO_DETAIL[i.item]) || i.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
