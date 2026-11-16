import Link from "next/link";
import { UserPlus } from "lucide-react";

import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import ConfirmAction from "@/modules/admin/view/components/ConfirmAction";
import { EmptyState, PageHeader, Pill } from "@/modules/admin/view/components/ui";
import { formatDateTime } from "@/shared/utils/time";

import { issueLinkAction, setDisabledAction } from "../controller/accounts.actions";
import { displayName, STAFF_ROLE_LABELS, type StaffAccount } from "../model/accounts.model";

import ChangeRoleForm from "./components/ChangeRoleForm";
import { ACCOUNT_STATUS_PILL } from "./components/status";

const ROLE_ORDER = ["admin", "operator", "phi"] as const;
const ROLE_HEADINGS = { admin: "Administrators", operator: "Kitchen operators", phi: "Health inspectors" } as const;

export default function AccountsView({ accounts, currentUserId }: { accounts: StaffAccount[]; currentUserId: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Access"
        title="Staff accounts"
        description="Everyone who can sign in to the kitchen console or this admin site. Customers manage their own accounts in the app and are not listed here."
        actions={
          <Link href="/admin/accounts/invite"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            <UserPlus className="h-4 w-4" />
            Invite staff
          </Link>
        }
      />

      {accounts.length === 0 && <EmptyState>No staff accounts yet.</EmptyState>}

      <div className="space-y-10">
        {ROLE_ORDER.map((role) => {
          const group = accounts.filter((a) => a.role === role);
          if (group.length === 0) return null;
          return (
            <section key={role}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {ROLE_HEADINGS[role]} <span className="text-slate-400">({group.length})</span>
              </h3>
              <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                {group.map((a) => (
                  <AccountRow key={a.userId} account={a} isSelf={a.userId === currentUserId} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function AccountRow({ account: a, isSelf }: { account: StaffAccount; isSelf: boolean }) {
  const status = ACCOUNT_STATUS_PILL[a.status];
  return (
    <li className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
            {displayName(a)}
            {isSelf && <Pill tone="slate">You</Pill>}
          </p>
          <p className="truncate text-sm text-slate-500">{a.email}</p>
          <p className="mt-1 text-xs text-slate-500">
            {STAFF_ROLE_LABELS[a.role]}
            {a.role !== "admin" && (
              <>
                {" · "}
                {a.kitchens.length === 0 ? (
                  <span className="font-medium text-amber-700">no kitchen access</span>
                ) : (
                  a.kitchens.map((k, i) => (
                    <span key={k.id}>
                      {i > 0 && ", "}
                      <Link href={`/admin/kitchens/${k.id}`} className="text-emerald-700 hover:underline">{k.name}</Link>
                    </span>
                  ))
                )}
              </>
            )}
          </p>
        </div>
        <div className="text-right">
          <Pill tone={status.tone}>{status.label}</Pill>
          <p className="mt-1 text-xs text-slate-400">
            {a.lastSignInAt ? `Last sign-in ${formatDateTime(a.lastSignInAt, PLATFORM_TIMEZONE)}` : "Never signed in"}
          </p>
        </div>
      </div>

      {!isSelf && (
        <details className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
          <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">Manage</summary>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
              <ChangeRoleForm userId={a.userId} role={a.role} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {a.status === "invited" ? "Set-up link" : "Password"}
              </p>
              <ConfirmAction
                action={issueLinkAction}
                fields={{ user_id: a.userId }}
                label={a.status === "invited" ? "New set-up link" : "Create reset link"}
                tone="outline"
                pendingText="Creating..."
                disabled={a.status === "disabled"}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Access</p>
              {a.status === "disabled" ? (
                <ConfirmAction
                  action={setDisabledAction}
                  fields={{ user_id: a.userId, disabled: "false" }}
                  label="Enable account"
                  tone="outline"
                  pendingText="Enabling..."
                />
              ) : (
                <ConfirmAction
                  action={setDisabledAction}
                  fields={{ user_id: a.userId, disabled: "true" }}
                  label="Disable account"
                  confirm="They lose access immediately."
                  confirmLabel="Disable"
                  tone="outline-danger"
                  pendingText="Disabling..."
                />
              )}
            </div>
          </div>
        </details>
      )}
    </li>
  );
}
