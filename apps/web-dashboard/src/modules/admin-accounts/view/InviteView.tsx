import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, PageHeader } from "@/modules/admin/view/components/ui";

import InviteForm from "./components/InviteForm";

export default function InviteView({
  kitchens,
  defaultKitchenId,
}: {
  kitchens: { id: string; name: string; code: string }[];
  defaultKitchenId: string | null;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/accounts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Staff accounts
      </Link>
      <PageHeader
        eyebrow="Access"
        title="Invite staff"
        description="Creates the person's account with its role and kitchen. They set their own password with the link you send them; you never see or choose it."
      />
      <Card>
        <InviteForm kitchens={kitchens} defaultKitchenId={defaultKitchenId} />
      </Card>
    </div>
  );
}
