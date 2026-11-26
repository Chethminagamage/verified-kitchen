import type { PillTone } from "@/modules/admin/view/components/ui";

import type { AccountStatus } from "../../model/accounts.model";

export const ACCOUNT_STATUS_PILL: Record<AccountStatus, { label: string; tone: PillTone }> = {
  active: { label: "Active", tone: "green" },
  invited: { label: "Invited", tone: "amber" },
  disabled: { label: "Disabled", tone: "red" },
};
