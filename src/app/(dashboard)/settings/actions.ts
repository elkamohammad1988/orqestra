"use server";

/**
 * Settings server actions.
 *
 * Same pattern as the auth actions: forms in the client call these directly,
 * we mutate via the cookie-bound Supabase client, then redirect or return
 * `{ error }`. No API routes needed.
 *
 * The danger-zone actions (delete account) call Supabase Admin endpoints
 * which require the SERVICE_ROLE key — wired up in lib/supabase/admin.ts.
 * Skipped silently in dev if that key isn't set.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { NameSchema, PasswordSchema } from "@/lib/validation/auth";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet." };
  }
  const parsed = NameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name." };
  }
  const name = parsed.data;

  const supabase = createClient();
  // `data` lands in user_metadata. We mirror it as both `name` (the canonical
  // key our app reads) and `full_name` (the convention Supabase uses for
  // OAuth profile data, so the two don't drift if the user signs in via
  // Google later).
  const { error } = await supabase.auth.updateUser({
    data: { name, full_name: name },
  });
  // Don't echo Supabase's raw message — it can include internal column or
  // constraint details. Log server-side, show a generic line.
  if (error) {
    console.warn("[settings] updateProfile:", error.message);
    return { error: "We couldn't update your profile. Please try again." };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateAccountPassword(
  formData: FormData,
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet." };
  }
  const parsed = PasswordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.warn("[settings] updateAccountPassword:", error.message);
    return { error: "We couldn't update your password. Please try again." };
  }
  return { ok: true };
}

/**
 * Permanently delete the caller's account + cascade everything they own.
 *
 * Requires the service role key (admin client). On the way in we re-check
 * the session so a stale cookie can't trigger someone else's deletion.
 */
export async function deleteAccount(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet." };
  }
  if (!hasServiceRole()) {
    return {
      error:
        "Account deletion isn't available — SUPABASE_SERVICE_ROLE_KEY isn't configured on the server.",
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  // Workflows / runs cascade-delete via the FK on user_id. After the user
  // is gone the session cookie is meaningless; signOut clears it so we
  // don't keep flashing the now-stale dashboard.
  await supabase.auth.signOut();
  redirect("/");
}
