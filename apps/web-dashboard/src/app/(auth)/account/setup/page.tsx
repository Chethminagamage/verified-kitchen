import type { Metadata } from "next";

import { parseSetupLink } from "@/modules/auth/model/setup.model";
import AccountSetupView from "@/modules/auth/view/AccountSetupView";

export const metadata: Metadata = {
  title: "Set up your account",
  // The URL carries a one-time token: never send it on to another site.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function AccountSetupPage({ searchParams }: PageProps<"/account/setup">) {
  const { token_hash, type } = await searchParams;
  return <AccountSetupView link={parseSetupLink(token_hash, type)} />;
}
