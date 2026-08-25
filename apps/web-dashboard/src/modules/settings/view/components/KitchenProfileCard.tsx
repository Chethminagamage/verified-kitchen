import {
  Building2,
  MapPin,
  UserRound,
  Fingerprint,
} from "lucide-react";

import type {
  KitchenProfile,
} from "../../model/settings.model";

interface KitchenProfileCardProps {
  profile: KitchenProfile;
}

export default function KitchenProfileCard({
  profile,
}: KitchenProfileCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
          <Building2 className="h-5 w-5 text-emerald-700" />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Kitchen Profile
          </h3>

          <p className="text-sm text-slate-500">
            Registered monitoring location
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 text-slate-400" />

          <div>
            <p className="text-xs text-slate-500">
              Kitchen Name
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
              {profile.kitchenName}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-4 w-4 text-slate-400" />

          <div>
            <p className="text-xs text-slate-500">
              Kitchen ID
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
              {profile.kitchenId}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />

          <div>
            <p className="text-xs text-slate-500">
              Location
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
              {profile.location}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-4 w-4 text-slate-400" />

          <div>
            <p className="text-xs text-slate-500">
              Operator
            </p>

            <p className="mt-1 text-sm font-medium text-slate-900">
              {profile.operatorName}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}