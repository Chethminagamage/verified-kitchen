import { Building2, Camera, Hash, MapPin, RadioTower, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { IconTile, PANEL_CLASS } from "@/shared/components/ui/Panel";
import StatusPill from "@/shared/components/ui/StatusPill";

import type { KitchenProfile, MonitoringStatus } from "../../model/settings.model";

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

interface KitchenSummaryCardProps {
  profile: KitchenProfile;
  monitoring: MonitoringStatus;
}

/** Top of the Settings page: which kitchen this console runs, and whether its monitoring is running. */
export default function KitchenSummaryCard({ profile, monitoring }: KitchenSummaryCardProps) {
  return (
    <section className={`${PANEL_CLASS} p-5 sm:p-6`} aria-label="Kitchen">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={Building2} tone="positive" size="lg" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">{profile.kitchenName}</h3>
            <p className="flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {profile.location}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={monitoring.cameraOnline ? "positive" : "neutral"} icon={Camera}>
            Camera {monitoring.cameraOnline ? "running" : "off"}
          </StatusPill>
          <StatusPill tone={monitoring.sensorsOnline ? "positive" : "neutral"} icon={RadioTower}>
            Sensors {monitoring.sensorsOnline ? "running" : "off"}
          </StatusPill>
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
        <Fact icon={Hash} label="Kitchen code" value={profile.kitchenId} />
        <Fact icon={UserRound} label="Operator" value={profile.operatorName} />
        <Fact icon={RadioTower} label="Latest sensor reading" value={monitoring.lastReadingLabel ?? "None yet"} />
      </dl>
    </section>
  );
}
