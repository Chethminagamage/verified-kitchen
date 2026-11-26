import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, PageHeader } from "@/modules/admin/view/components/ui";

import { DEFAULT_LISTING } from "../model/kitchens.model";

import KitchenForm from "./components/KitchenForm";

export default function NewKitchenView({ timeZones }: { timeZones: string[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/kitchens" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Kitchens
      </Link>
      <PageHeader
        eyebrow="Onboarding · step 1 of 4"
        title="New kitchen"
        description="Start with the listing. The kitchen gets its permanent code and stays hidden from the app; next you register its devices, invite its operator and add its menu."
      />
      <Card>
        <KitchenForm initial={DEFAULT_LISTING} timeZones={timeZones} />
      </Card>
    </div>
  );
}
