/**
 * Supabase — MIDDLEWARE client (3 of 3) + the session refresh & route gate.
 *
 * Two responsibilities, intentionally fused into one function:
 *
 *   1. SESSION REFRESH — Supabase access tokens are short-lived (1h). Without
 *      a refresh step, a user logged in last night would 401 this morning.
 *      Calling `supabase.auth.getUser()` here triggers an automatic refresh
 *      (using the long-lived refresh token cookie), and the `set` callback
 *      writes the *new* tokens onto the outgoing response cookies — so the
 *      browser stores them and the next request is authenticated.
 *
 *   2. ROUTE GATING — same pass also redirects unauthenticated users away
 *      from /dashboard and /workflows, and bounces signed-in users away from
 *      /login and /signup. Doing both in one place keeps auth logic out of
 *      every page component.
 *
 * The reason we re-construct `response = NextResponse.next({ request })`
 * inside the cookie callbacks is subtle: when Supabase writes refreshed
 * cookies onto the *request*, we need to bubble them onto the response too,
 * otherwise the new cookies never make it back to the browser.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Phase 1 affordance: with no Supabase keys, just let the request through.
  // Marketing routes still render; protected routes will surface a clear env
  // error from `requireEnv()` if anything tries to actually create a client.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Mirror onto both request and response — see file header.
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // This single call also refreshes the access token if it's expired —
  // that's why we have to do it on every request, not lazily on demand.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // /workflows/demo is the public landing-page CTA target — it MUST stay
  // reachable without auth, otherwise "Try the live demo" dies at the
  // middleware gate.
  const isPublicWorkflowSurface = url.pathname === "/workflows/demo";

  const isProtected =
    url.pathname.startsWith("/dashboard") ||
    (url.pathname.startsWith("/workflows") && !isPublicWorkflowSurface);
  const isAuthRoute =
    url.pathname.startsWith("/login") || url.pathname.startsWith("/signup");

  if (!user && isProtected) {
    // Preserve the FULL target URL (path + query) so the post-auth redirect
    // can land them where they intended — e.g. `/workflows/new?template=demo`
    // round-trips correctly, not as bare `/workflows/new`.
    const target = request.nextUrl.pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", target);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
