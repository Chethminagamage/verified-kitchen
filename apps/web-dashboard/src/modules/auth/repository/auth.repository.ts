import { cookies } from "next/headers";

import { createClient } from "@/infrastructure/supabase/server";

import {
  InvalidCredentialsError,
  SESSION_COOKIE,
  type LoginCredentials,
} from "../model/auth.model";

export class AuthRepository {
  async signIn(
    credentials: LoginCredentials
  ) {
    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

    if (error) {
      // Only a rejected email/password is the user's mistake; anything else
      // (network, rate limit, service outage) must not be reported as one.
      if (error.code === "invalid_credentials") throw new InvalidCredentialsError();
      throw new Error(`Supabase sign-in failed: ${error.code ?? error.status} ${error.message}`);
    }

    // No maxAge: the browser drops it when it is closed (see auth.model.ts).
    (await cookies()).set(SESSION_COOKIE, String(Date.now()), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return data.user;
  }

  async signOut() {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.signOut();

    (await cookies()).delete(SESSION_COOKIE);

    if (error) {
      throw new Error(error.message);
    }
  }
}