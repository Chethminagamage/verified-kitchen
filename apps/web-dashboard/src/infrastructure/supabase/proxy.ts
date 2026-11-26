import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/config/env";
import {
  ADMIN_SESSION_MAX_AGE_MS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
  expiredSessionRedirect,
  isAdminPath,
  isSignInPage,
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
  // or after one shift (4 hours on the admin site), even though the Supabase
  // refresh token would last longer.
  const { pathname } = request.nextUrl;
  const maxAge = isAdminPath(pathname) ? ADMIN_SESSION_MAX_AGE_MS : SESSION_MAX_AGE_MS;
  if (
    data?.claims &&
    !sessionStillValid(request.cookies.get(SESSION_COOKIE)?.value, Date.now(), maxAge)
  ) {
    // Ends this browser's session only; other devices stay signed in.
    // signOut() clears the auth cookies through setAll() above.
    await supabase.auth.signOut({ scope: "local" });

    // Sign-in pages (and the set-up link page) render normally, signed out.
    const onLoginPage = isSignInPage(pathname);
    const response = onLoginPage
      ? supabaseResponse
      : NextResponse.redirect(new URL(expiredSessionRedirect(pathname), request.url));

    if (!onLoginPage) {
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    }
    response.cookies.delete(SESSION_COOKIE);

    return response;
  }

  return supabaseResponse;
}