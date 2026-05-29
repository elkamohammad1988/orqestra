"use server";

/**
 * Upgrade request server action.
 *
 * Pre-Stripe checkout: instead of pretending to run a payment, we record
 * the user's intent in `upgrade_requests` and confirm with a "we'll be in
 * touch" UI. Once Stripe Checkout is wired, this becomes the entry point
 * for creating a Checkout Session — the call signature stays identical so
 * the client doesn't need to change.
 *
 * Why record server-side instead of just showing a confirmation toast?
 *   • The operations team needs the list of who wants Pro to actually
 *     activate accounts when checkout ships.
 *   • Honest scaffolding: the dialog says "we'll email you" and that's
 *     true — there's a real row, not vapor.
 *   • RLS on the table means a user can only insert their own row, and
 *     the email column is also captured for the case where they want
 *     activation on a different address than their account.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";
import { EmailSchema, NoteSchema } from "@/lib/validation/auth";
import type { PlanId, BillingPeriod } from "@/lib/billing/plans";

export interface UpgradeRequestInput {
  planId: PlanId;
  period: BillingPeriod;
  email: string;
  note?: string;
}

export interface UpgradeRequestResult {
  ok: boolean;
  error?: string;
}

// Free + Stripe-managed `pro` and `team` are the only valid request targets
// here. `free` is the default state and doesn't go through this flow.
const UpgradeInputSchema = z.object({
  planId: z.enum(["pro", "team"]),
  period: z.enum(["monthly", "yearly"]),
  email: EmailSchema,
  note: NoteSchema.optional(),
});

export async function requestUpgradeAccess(
  input: UpgradeRequestInput,
): Promise<UpgradeRequestResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Upgrades aren't available in demo mode.",
    };
  }

  // Bind ownership BEFORE validating shape so the rate-limit key is keyed
  // by user-id when possible (more accurate for legitimate users) and by
  // IP for anonymous abusers.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in to upgrade your plan." };
  }

  // 5 requests per minute per identity is generous for a real user (one
  // legitimate submission per attempt) and tight enough to stop a script
  // from flooding the table.
  const rl = await checkRateLimit("upgrade", rateLimitKeyFromHeaders(user.id));
  if (!rl.success) {
    return {
      ok: false,
      error: "Too many requests. Please try again in a moment.",
    };
  }

  const parsed = UpgradeInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid request." };
  }

  const { error } = await supabase.from("upgrade_requests").insert({
    user_id: user.id,
    plan_id: parsed.data.planId,
    period: parsed.data.period,
    email: parsed.data.email,
    note: parsed.data.note ?? null,
  });

  if (error) {
    console.error("[upgrade] requestUpgradeAccess:", error.message);
    return { ok: false, error: "We couldn't record your request. Try again." };
  }
  return { ok: true };
}
