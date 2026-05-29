/**
 * Root middleware — runs on every matched request BEFORE the route renders.
 * Delegates to `updateSession` which handles both session refresh and the
 * protected-route redirect. See lib/supabase/middleware.ts for the why.
 */

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // The matcher is a *negative* filter — we run middleware on everything
  // EXCEPT the things listed. Static assets and image files don't need
  // session refresh, so we exclude them to avoid wasting work and to keep
  // the middleware bundle from being invoked on every PNG request.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
