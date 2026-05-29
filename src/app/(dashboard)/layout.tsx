/**
 * Dashboard layout — wraps all (dashboard) route group pages.
 *
 * This file does two things:
 *  1. Resolves the current user server-side (one DB roundtrip per dashboard
 *     navigation, then cached for the duration of the request).
 *  2. Renders the persistent shell (sidebar + topbar) around `{children}`.
 *
 * Because this is a Server Component, the user fetch happens BEFORE any
 * HTML is sent — no flash of un-authed content, no client-side loading
 * spinner for the user identity. The auth gate itself lives in the
 * middleware; by the time we render here, the user is guaranteed to exist
 * (or we're in the "no Supabase configured" demo path).
 */

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getUsage } from "@/lib/billing/usage";
import type { AuthUser } from "@/types";

async function getCurrentUser(): Promise<AuthUser> {
  // Phase 1 affordance — see lib/env.ts. Lets you preview the dashboard
  // shell with real-looking data before plugging in Supabase keys.
  if (!isSupabaseConfigured()) {
    return {
      id: "demo-user",
      email: "demo@orqestra.ai",
      name: "Demo User",
      avatar_url: null,
    };
  }

  const supabase = createClient();
  // `getUser()` re-verifies the JWT against Supabase (vs. `getSession()`
  // which trusts the cookie). For protected pages, re-verifying is the
  // safer default — slightly more cost, but no chance of accepting a
  // tampered cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    id: user?.id ?? "anon",
    email: user?.email ?? null,
    name: (user?.user_metadata?.name as string | undefined) ?? null,
    avatar_url: (user?.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Run the auth fetch and usage fetch in parallel. Both queries are
  // independent (usage filters by auth.uid() inside Postgres) so we don't
  // need to chain them.
  const [user, usage] = await Promise.all([getCurrentUser(), getUsage()]);

  const sidebarUsage = {
    planName: usage.plan.name,
    runsUsed: usage.runsThisMonth.used,
    runsLimit: usage.runsThisMonth.limit,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar usage={sidebarUsage} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
