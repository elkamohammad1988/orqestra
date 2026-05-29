import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Choose a new password",
};

// The page is reachable only via the recovery link. By the time the user
// lands here, /auth/callback has already exchanged the code for a session,
// so we should see an authenticated user. If we don't, the link was
// expired, reused, or hand-typed — send them back to start the flow over.
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password");
  }
  return <ResetPasswordForm />;
}
