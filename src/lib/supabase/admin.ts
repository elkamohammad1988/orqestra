/**
 * Supabase — ADMIN client.
 *
 * Uses the `SUPABASE_SERVICE_ROLE_KEY`, which BYPASSES Row-Level Security.
 * Anything that needs to operate across users (deleting an account,
 * reading another user's data for an audit log, running scheduled jobs)
 * has to go through here.
 *
 * STRICT RULES:
 *   • This file MUST be imported only from server-only code paths. Never
 *     a Client Component, never a route reachable without an auth check.
 *   • Every callsite must verify the acting user's identity FIRST — RLS
 *     isn't there to catch us anymore.
 *   • The service role key must NEVER ship in NEXT_PUBLIC_*. The variable
 *     name `SUPABASE_SERVICE_ROLE_KEY` is server-only by Next's convention.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function hasServiceRole(): boolean {
  return !!(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin client requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.",
    );
  }
  // Disable automatic token refresh — there's no user session to refresh,
  // and the auto-refresh loop would just burn CPU on every request.
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
