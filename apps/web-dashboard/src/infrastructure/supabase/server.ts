import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/config/env";
import type { Database } from "@/shared/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(name, value, options)
            );
          } catch {
            /*
             * Server Components cannot set cookies. The session is
             * refreshed by the Next.js Proxy (src/proxy.ts) instead.
             */
          }
        },
      },
    }
  );
}
