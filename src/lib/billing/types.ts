/**
 * Shared billing types + pure helpers — safe to import from anywhere
 * (server, client, edge). Keeps the actual `getUsage()` (which depends on
 * `next/headers` via the Supabase server client) out of the client bundle.
 */

import type { Plan } from "./plans";

export interface Usage {
  plan: Plan;
  workflows: { used: number; limit: number };
  runsThisMonth: { used: number; limit: number };
}

/** Percent used clamped to [0, 100]. Handy for progress bars. */
export function usagePercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
