/**
 * OAuth callback — the second half of the Google sign-in flow.
 *
 * Flow recap (initiated from `signInWithGoogle()` in (auth)/actions.ts):
 *   1. Server action asks Supabase for the Google authorization URL.
 *   2. Browser is redirected to Google.
 *   3. Google redirects back here with `?code=...`.
 *   4. We exchange the code for a session — Supabase writes the session
 *      cookies via the server client.
 *   5. We redirect to /dashboard (or the `next` URL the user came from).
 *
 * If anything goes wrong we bounce back to /login with `?error=oauth_failed`
 * so the login page can surface a friendly message.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validate `next` so an attacker can't pass `?next=//evil.com` and ride
  // the just-issued session cookie offsite. safeNextPath falls back to
  // /dashboard for anything that isn't a relative path on this origin.
  const next = safeNextPath(searchParams.get("next"));

  if (code && isSupabaseConfigured()) {
    const supabase = createClient();
    // This call sets the session cookies on the response. Because this is
    // a Route Handler (not a Server Component), the `set` in our server
    // client succeeds normally — no try/catch dance needed.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
