import Link from "next/link";
import { UserPlus } from "lucide-react";

import ConfirmAction from "@/modules/admin/view/components/ConfirmAction";
import { Card, EmptyState, Pill } from "@/modules/admin/view/components/ui";
import { displayName, STAFF_ROLE_LABELS, type StaffAccount } from "@/modules/admin-accounts/model/accounts.model";
import { ACCOUNT_STATUS_PILL } from "@/modules/admin-accounts/view/components/status";

import { setStaffAccessAction } from "../../controller/kitchens.actions";

import AddStaffForm from "./AddStaffForm";

export default function StaffCard({
  kitchenId,
  staff,
  otherStaff,
}: {
  kitchenId: string;
  staff: StaffAccount[];
  otherStaff: StaffAccount[];
}) {
  return (
    <Card
      title="Staff with access"
      description="Operators run the kitchen in its console; inspectors can view it without changing anything."
      actions={
        <Link
          href={`/admin/accounts/invite?kitchen=${kitchenId}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Link>
      }
    >
      {staff.length === 0 ? (
        <EmptyState>Nobody has access yet. Invite the kitchen&apos;s operator.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100">
          {staff.map((s) => {
            const status = ACCOUNT_STATUS_PILL[s.status];
            return (
              <li key={s.userId} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{displayName(s)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {s.email} · {STAFF_ROLE_LABELS[s.role]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={status.tone}>{status.label}</Pill>
                  <ConfirmAction
                    action={setStaffAccessAction}
                    fields={{ user_id: s.userId, kitchen_id: kitchenId, linked: "false" }}
                    label="Remove"
                    confirm="Remove access?"
                    tone="outline"
                    pendingText="Removing..."
                    small
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5">
        <AddStaffForm
          kitchenId={kitchenId}
          options={otherStaff.map((s) => ({
            userId: s.userId,
            label: `${displayName(s)} (${s.role === "phi" ? "inspector" : "operator"})`,
          }))}
        />
      </div>
    </Card>
  );
}
