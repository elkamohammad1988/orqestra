/**
 * Usage tracking — reads the current user's consumption against their plan.
 *
 * SERVER-SIDE ONLY. Used by the dashboard usage card, the settings page,
 * and the workflow save / run endpoints to enforce plan limits.
 *
 * Right now everything is computed live with two cheap aggregate queries.
 * If we ever have users with thousands of runs a month, swap to a
 * materialized view refreshed on a schedule — RLS still applies.
 */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentPlanId, getPlan } from "./plans";
import type { Usage } from "./types";

// Re-export so server callsites can keep `import { getUsage, Usage } from
// "@/lib/billing/usage"` ergonomic. Client callsites that only need types
// must import from "./types" directly — `server-only` above will trip the
// bundler if they reach for this file.
export type { Usage } from "./types";
export { usagePercent } from "./types";

/**
 * Snapshot of the caller's usage. Returns sensible defaults if Supabase
 * isn't configured (so the dashboard still renders in dev) or if the user
 * isn't signed in.
 */
export async function getUsage(): Promise<Usage> {
  const plan = getPlan(getCurrentPlanId());

  const empty: Usage = {
    plan,
    workflows: { used: 0, limit: plan.limits.maxWorkflows },
    runsThisMonth: { used: 0, limit: plan.limits.runsPerMonth },
  };

  // Unconfigured / portfolio mode: hand back a believable in-use snapshot
  // instead of "0 / limit" zeros. Keeps the sidebar usage card + settings
  // billing card looking like a real account on the demo deployment.
  if (!isSupabaseConfigured()) {
    return {
      plan,
      workflows: { used: 2, limit: plan.limits.maxWorkflows },
      runsThisMonth: { used: 67, limit: plan.limits.runsPerMonth },
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  // First day of the current calendar month, in UTC. Cheap to compute,
  // and aligning to UTC means quotas don't reset mid-day for users in
  // weird timezones.
  const startOfMonth = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString();

  // Run both counts in parallel — they're independent and the dashboard
  // waits on the slower one anyway.
  const [workflowsCount, runsCount] = await Promise.all([
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("runs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", startOfMonth),
  ]);

  return {
    plan,
    workflows: {
      used: workflowsCount.count ?? 0,
      limit: plan.limits.maxWorkflows,
    },
    runsThisMonth: {
      used: runsCount.count ?? 0,
      limit: plan.limits.runsPerMonth,
    },
  };
}

