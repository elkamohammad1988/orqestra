import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsSections } from "@/components/settings/settings-sections";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getUsage } from "@/lib/billing/usage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account, plan, and workspace.",
};

// Settings reads live usage every navigation — there's no value in caching
// stale counts here.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  // Unconfigured (portfolio / local dev) mode: render the settings surface
  // with a placeholder user + mock usage so the layout stays viewable in
  // screenshots. Form submits already return friendly "demo mode" errors
  // server-side, so the inputs are safe to interact with.
  if (!isSupabaseConfigured()) {
    const usage = await getUsage();
    return (
      <div className="container max-w-3xl py-8 sm:py-10">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            Settings
          </h1>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            Manage your account and workspace.
          </p>
        </header>
        <SettingsSections
          user={{
            id: "demo-user",
            email: "demo@orqestra.ai",
            name: "Demo User",
          }}
          usage={usage}
          canDeleteAccount={false}
        />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const usage = await getUsage();

  return (
    <div className="container max-w-3xl py-8 sm:py-10">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          Settings
        </h1>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground">
          Manage your account and workspace.
        </p>
      </header>

      <SettingsSections
        user={{
          id: user.id,
          email: user.email ?? null,
          name:
            (user.user_metadata?.name as string | undefined) ??
            (user.user_metadata?.full_name as string | undefined) ??
            null,
        }}
        usage={usage}
        canDeleteAccount={hasServiceRole()}
      />
    </div>
  );
}
