import { ActivityService } from "@/modules/admin-activity/service/activity.service";
import type { ActivityEntry } from "@/modules/admin-activity/model/activity.model";
import { AccountsService } from "@/modules/admin-accounts/service/accounts.service";
import type { StaffAccount } from "@/modules/admin-accounts/model/accounts.model";
import type { KitchenSummary } from "@/modules/admin-kitchens/model/kitchens.model";
import { KitchensService } from "@/modules/admin-kitchens/service/kitchens.service";
import { ReportsService } from "@/modules/admin-reports/service/reports.service";
import type { CustomerReport } from "@/modules/admin-reports/model/reports.model";

export interface AdminOverview {
  generatedAt: string;
  kitchens: { live: number; hidden: number };
  staff: { active: number; invited: number; disabled: number };
  devices: { total: number; reporting: number };
  hygieneReports7d: number;
  /** Hidden kitchens (still being set up) and live kitchens with silent devices. */
  attention: { kitchen: KitchenSummary; reason: string }[];
  pendingInvites: StaffAccount[];
  latestReports: CustomerReport[];
  activity: ActivityEntry[];
}

export class OverviewService {
  constructor(
    private readonly kitchens = new KitchensService(),
    private readonly accounts = new AccountsService(),
    private readonly reports = new ReportsService(),
    private readonly activity = new ActivityService()
  ) {}

  async get(now = new Date()): Promise<AdminOverview> {
    const [kitchens, staff, hygiene, activity] = await Promise.all([
      this.kitchens.list(now),
      this.accounts.list(),
      this.reports.list("hygiene", now),
      this.activity.latest(8),
    ]);
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    const attention = kitchens.flatMap((k) => {
      if (!k.isPublic) return [{ kitchen: k, reason: "Being set up: hidden from the app" }];
      if (k.devicesTotal > 0 && k.devicesReporting < k.devicesTotal) {
        return [{ kitchen: k, reason: `${k.devicesTotal - k.devicesReporting} device(s) not reporting` }];
      }
      if (k.devicesTotal === 0) return [{ kitchen: k, reason: "Live without monitoring devices" }];
      return [];
    });

    return {
      generatedAt: now.toISOString(),
      kitchens: { live: kitchens.filter((k) => k.isPublic).length, hidden: kitchens.filter((k) => !k.isPublic).length },
      staff: {
        active: staff.filter((s) => s.status === "active").length,
        invited: staff.filter((s) => s.status === "invited").length,
        disabled: staff.filter((s) => s.status === "disabled").length,
      },
      devices: {
        total: kitchens.reduce((n, k) => n + k.devicesTotal, 0),
        reporting: kitchens.reduce((n, k) => n + k.devicesReporting, 0),
      },
      hygieneReports7d: hygiene.filter((r) => new Date(r.createdAt).getTime() >= weekAgo).length,
      attention,
      pendingInvites: staff.filter((s) => s.status === "invited"),
      latestReports: hygiene.slice(0, 5),
      activity,
    };
  }
}
