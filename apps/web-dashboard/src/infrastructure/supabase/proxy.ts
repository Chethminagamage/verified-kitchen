import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/config/env";
import {
  SESSION_COOKIE,
  sessionStillValid,
} from "@/modules/auth/model/auth.model";
import type { Database } from "@/shared/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              supabaseResponse.cookies.set(
                name,
                value,
                options
              );
            }
          );

          Object.entries(headers).forEach(
            ([key, value]) => {
              supabaseResponse.headers.set(
                key,
                value
              );
            }
          );
        },
      },
    }
  );

  // Refresh/verify the current authentication token.
  const { data } = await supabase.auth.getClaims();

  // Session policy (auth.model.ts): a sign-in ends when the browser is closed
  // or after one shift, even though the Supabase refresh token would last longer.
  if (
    data?.claims &&
    !sessionStillValid(request.cookies.get(SESSION_COOKIE)?.value, Date.now())
  ) {
    // Ends this browser's session only; other devices stay signed in.
    // signOut() clears the auth cookies through setAll() above.
    await supabase.auth.signOut({ scope: "local" });

    const onLoginPage = request.nextUrl.pathname.startsWith("/login");
    const response = onLoginPage
      ? supabaseResponse
      : NextResponse.redirect(new URL("/login?error=expired", request.url));

    if (!onLoginPage) {
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    }
    response.cookies.delete(SESSION_COOKIE);

    return response;
  }

  return supabaseResponse;
}