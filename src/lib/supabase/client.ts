"use client";

/**
 * Supabase — BROWSER client (1 of 3).
 *
 * Use this client inside Client Components for: realtime subscriptions,
 * client-initiated auth flows that need to react to events, and any query
 * that needs to run in the browser.
 *
 * Pair with:
 *   - lib/supabase/server.ts     → for Server Components / Server Actions
 *   - lib/supabase/middleware.ts → for the per-request session refresh
 *
 * The browser client uses `localStorage` for the session under the hood —
 * but `@supabase/ssr` keeps it in sync with the cookies the server reads,
 * so the user stays signed in across both contexts.
 */

import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
