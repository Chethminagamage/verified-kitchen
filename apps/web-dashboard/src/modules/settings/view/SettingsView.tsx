import ChangePasswordForm from "@/modules/account/view/ChangePasswordForm";
import ProfileForm from "@/modules/account/view/ProfileForm";
import SecurityCard from "@/modules/account/view/SecurityCard";
import DesktopAlertsCard from "@/modules/alerts/view/DesktopAlertsCard";
import PageHeader from "@/shared/components/ui/PageHeader";
import SectionHeader from "@/shared/components/ui/SectionHeader";

import type { SettingsData } from "../model/settings.model";

import KitchenSummaryCard from "./components/KitchenSummaryCard";

export default function SettingsView({ data }: { data: SettingsData }) {
  const { account } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Your kitchen, your account and security, and alerts on this device."
      />

      <KitchenSummaryCard profile={data.kitchenProfile} monitoring={data.monitoring} />

      <section className="mt-10">
        <SectionHeader title="Your account" />
        <div className="grid gap-6 xl:grid-cols-2">
          <ProfileForm
            fullName={account.fullName}
            email={account.email}
            phone={account.phone}
            roleLabel={account.roleLabel}
          />
          <ChangePasswordForm />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Security and alerts" />
        <div className="grid gap-6 xl:grid-cols-2">
          <SecurityCard signedInLabel={account.signedInLabel} />
          <DesktopAlertsCard />
        </div>
      </section>
    </div>
  );
}
