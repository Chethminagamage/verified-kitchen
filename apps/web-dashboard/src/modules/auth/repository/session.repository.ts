import { cookies } from "next/headers";

import { createClient } from "@/infrastructure/supabase/server";

import { SESSION_COOKIE, sessionStillValid } from "../model/auth.model";

import type {
  KitchenSummary,
  OperatorSession,
} from "../model/session.model";

export class SessionRepository {
  /**
   * Loads the signed-in user, their profile and the kitchens Row Level
   * Security lets them see. Returns null when nobody is signed in.
   */
  async getSession(): Promise<OperatorSession | null> {
    // Same session policy as the Proxy, so pages and Server Functions never
    // trust a sign-in the Proxy would have ended (e.g. if a route is unmatched).
    const signedInAt = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!sessionStillValid(signedInAt, Date.now())) {
      return null;
    }

    const supabase = await createClient();

    // getUser() validates the token with Supabase Auth (not just the cookie).
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const [profileResult, kitchensResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, role, disabled_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("kitchens")
          .select("id, code, name, location, timezone")
          .order("code"),
      ]);

    if (profileResult.error) {
      throw new Error(
        `Could not load profile: ${profileResult.error.message}`
      );
    }

    if (kitchensResult.error) {
      throw new Error(
        `Could not load kitchens: ${kitchensResult.error.message}`
      );
    }

    const kitchens: KitchenSummary[] =
      kitchensResult.data;

    return {
      userId: user.id,
      email: user.email ?? "",
      fullName:
        profileResult.data?.full_name ?? null,
      // A missing profile row means the user has no granted role yet.
      role: profileResult.data?.role ?? "operator",
      disabled: Boolean(profileResult.data?.disabled_at),
      signedInAt: Number(signedInAt),
      kitchen: kitchens[0] ?? null,
      kitchens,
    };
  }
}
