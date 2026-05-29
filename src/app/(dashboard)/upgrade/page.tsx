import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentPlanId } from "@/lib/billing/plans";
import { UpgradeContent } from "@/components/billing/upgrade-content";

export const metadata: Metadata = {
  title: "Upgrade",
  description: "Pick the plan that fits how you ship.",
};

// Upgrades always reflect the live plan + the live email — no caching.
export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  // Unconfigured (portfolio / local dev) mode: render the upgrade surface
  // with a placeholder email so the pricing UI stays viewable in screenshots
  // and on the public demo deployment. The dialog's server action already
  // returns a friendly "demo mode" error when actually submitted.
  if (!isSupabaseConfigured()) {
    return (
      <UpgradeContent
        currentPlanId={getCurrentPlanId()}
        defaultEmail="demo@orqestra.ai"
      />
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <UpgradeContent
      currentPlanId={getCurrentPlanId()}
      defaultEmail={user.email ?? ""}
    />
  );
}
