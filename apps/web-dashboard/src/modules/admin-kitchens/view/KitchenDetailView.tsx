import Link from "next/link";
import { ArrowLeft, PartyPopper } from "lucide-react";

import { PLATFORM_TIMEZONE } from "@/modules/admin/model/admin.model";
import ConfirmAction from "@/modules/admin/view/components/ConfirmAction";
import { Card, PageHeader, Pill } from "@/modules/admin/view/components/ui";
import ActivityList from "@/modules/admin-activity/view/ActivityList";
import { formatDateTime } from "@/shared/utils/time";

import { setPublishedAction } from "../controller/kitchens.actions";
import { formatHours, readyToPublish, type KitchenDetail } from "../model/kitchens.model";

import DevicesCard from "./components/DevicesCard";
import KitchenForm from "./components/KitchenForm";
import { RatingPill } from "./components/RatingPill";
import ReadinessCard from "./components/ReadinessCard";
import StaffCard from "./components/StaffCard";

export default function KitchenDetailView({
  kitchen,
  timeZones,
  justCreated,
}: {
  kitchen: KitchenDetail;
  timeZones: string[];
  justCreated: boolean;
}) {
  const ready = readyToPublish(kitchen.readiness);
  const l = kitchen.listing;

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/admin/kitchens" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Kitchens
      </Link>

      <PageHeader
        eyebrow={`Kitchen · ${kitchen.code}`}
        title={`${l.emoji ? `${l.emoji} ` : ""}${l.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {kitchen.isPublic ? <Pill tone="green">Live in the app</Pill> : <Pill tone="slate">Hidden from the app</Pill>}
            <RatingPill rating={kitchen.rating} />
            <span>
              {l.location || "No location"} · {formatHours(l.opensAt, l.closesAt)} ({l.timezone})
              {kitchen.publishedAt && ` · live since ${formatDateTime(kitchen.publishedAt, PLATFORM_TIMEZONE)}`}
            </span>
          </span>
        }
        actions={
          kitchen.isPublic ? (
            <ConfirmAction
              action={setPublishedAction}
              fields={{ kitchen_id: kitchen.id, published: "false" }}
              label="Hide from app"
              confirm="Customers will no longer see this kitchen."
              confirmLabel="Hide"
              tone="outline-danger"
              pendingText="Hiding..."
            />
          ) : (
            <ConfirmAction
              action={setPublishedAction}
              fields={{ kitchen_id: kitchen.id, published: "true" }}
              label="Put live"
              confirm="Customers will see this kitchen and can order."
              confirmLabel="Go live"
              tone="primary"
              confirmTone="primary"
              pendingText="Publishing..."
              disabled={!ready}
            />
          )
        }
      />

      {justCreated && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">{l.name} is created as {kitchen.code}.</span> Next: register its devices, invite
            its operator and add its menu. The checklist shows what is left before it can go live.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ReadinessCard items={kitchen.readiness} live={kitchen.isPublic} />
          <DevicesCard kitchenId={kitchen.id} kitchenCode={kitchen.code} devices={kitchen.devices} generatedAt={kitchen.generatedAt} />
          <StaffCard kitchenId={kitchen.id} staff={kitchen.staff} otherStaff={kitchen.otherStaff} />
        </div>
        <div className="space-y-6">
          <Card title="Listing" description="What customers see in the app, and when they can order.">
            <KitchenForm kitchenId={kitchen.id} initial={l} timeZones={timeZones} live={kitchen.isPublic} />
          </Card>
          <Card title="Menu">
            <p className="text-sm leading-6 text-slate-500">
              Menu editing is coming to the admin site soon. Until then, the platform team adds menu items on
              request.
            </p>
          </Card>
          <Card title="Recent activity">
            <ActivityList entries={kitchen.activity} />
          </Card>
        </div>
      </div>
    </div>
  );
}
