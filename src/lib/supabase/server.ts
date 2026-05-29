/**
 * Supabase — SERVER client (2 of 3).
 *
 * Use this inside Server Components, Server Actions, and Route Handlers.
 * Unlike the browser client, this one has no global instance — it's bound
 * to the *current request's cookies* via next/headers, so every call gets
 * the right user.
 *
 * Pair with:
 *   - lib/supabase/client.ts     → for Client Components
 *   - lib/supabase/middleware.ts → which refreshes the cookies this reads
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // `cookies().set()` throws when called from a Server Component
            // (they're read-only by design — only Server Actions and Route
            // Handlers can write cookies). We swallow the throw because the
            // middleware is the canonical place where session refresh writes
            // happen — this catch is just for the edge case where Supabase's
            // internal token rotation tries to write from a server render.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same reason as `set` above.
          }
        },
      },
    },
  );
}
