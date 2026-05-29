"use server";

/**
 * Auth server actions.
 *
 * Why server actions (not API routes)?
 *   - Credentials never touch the client bundle. The handler runs on the
 *     server, sees the form data, never ships secrets to the browser.
 *   - `useFormStatus` on the client gives us free pending UI without state
 *     libraries — we just await the action from the form.
 *   - On success we `redirect()`, which on the server is a special throw
 *     that Next intercepts. That's why successful paths in this file return
 *     `never` (they redirect) and only failure paths return `{ error }`.
 *
 * Each abuse-prone action is rate-limited by IP at the app layer — Supabase
 * has its own backend throttling, but adding a thin app-level shield buys
 * us protection against credential stuffing, signup flooding, and email
 * bombing without burning a Supabase round-trip per attempt.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";
import { EmailSchema, PasswordSchema } from "@/lib/validation/auth";
import { verifyTurnstile, clientIpFromHeaders } from "@/lib/auth/turnstile";
import { safeNextPath } from "@/lib/auth/safe-redirect";

export interface AuthResult {
  error?: string;
}

// ─── Auth rate limit ────────────────────────────────────────────────────────
//
// One IP-keyed bucket covers all auth flows (sign-in, sign-up, password
// reset, resend confirmation). Tuned to 5 attempts per 10 minutes — strict
// enough to stop credential stuffing and email flooding, generous enough
// that a legitimate user fat-fingering their password a few times stays
// well under. Policy + Redis backing live in lib/rate-limit.ts.
async function rateLimited(kind: string): Promise<AuthResult | null> {
  const rl = await checkRateLimit(
    "auth",
    `${kind}:${rateLimitKeyFromHeaders(null)}`,
  );
  if (!rl.success) {
    return {
      error: "Too many attempts. Please try again in a moment.",
    };
  }
  return null;
}

/**
 * Translate raw Supabase auth errors into messages a user can act on.
 *
 * For known patterns we return a specific, friendly message. For anything
 * we don't recognize we deliberately fall back to a generic line and log
 * the original server-side — Supabase's raw text can include internal
 * details (table names, constraint hints) that have no business reaching
 * a user.
 */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first — check your inbox for the confirmation link.";
  }
  if (m.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (m.includes("email rate limit") || m.includes("over_email_send_rate_limit")) {
    return "Too many attempts. Please try again in a few minutes.";
  }
  if (m.includes("password should be") || m.includes("weak password")) {
    return "Password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  }
  if (m.includes("network") || m.includes("fetch failed")) {
    return "Network error — please check your connection and try again.";
  }
  // Unrecognized: log for diagnosis, never echo verbatim.
  console.warn("[auth] unmapped Supabase error:", message);
  return "Something went wrong. Please try again in a moment.";
}

export async function signInWithPassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Authentication isn't configured yet. Add Supabase keys to .env.local.",
    };
  }

  const limited = await rateLimited("signIn");
  if (limited) return limited;

  // Turnstile is a no-op pass-through when the env vars aren't set, so
  // this works the same in local dev and in a production environment that
  // has the keys configured.
  const turnstileToken = formData.get("cf-turnstile-response");
  const turnstileOk = await verifyTurnstile({
    token: typeof turnstileToken === "string" ? turnstileToken : null,
    ip: clientIpFromHeaders(),
  });
  if (!turnstileOk) {
    return { error: "Please complete the verification challenge." };
  }

  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email." };
  }
  // Don't run the password through the strength schema on sign-in — a user
  // may have an account with a 6-char legacy password. We only validate that
  // it's a non-empty string.
  const password = String(formData.get("password") ?? "");
  if (!password) {
    return { error: "Please enter your password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailResult.data,
    password,
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // Honor the `next` param if the user was bounced here from a protected
  // page — preserves intent (e.g. forking the demo as a template). The
  // safe-redirect guard rejects open-redirect attempts.
  const next = safeNextPath(formData.get("next") as string | null);
  // `redirect()` throws — execution stops here. The middleware already saw
  // the new session cookie that Supabase set during sign-in, so the next
  // request will pass the auth gate.
  redirect(next);
}

export async function signUpWithPassword(formData: FormData): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Authentication isn't configured yet. Add Supabase keys to .env.local.",
    };
  }

  const limited = await rateLimited("signUp");
  if (limited) return limited;

  const turnstileToken = formData.get("cf-turnstile-response");
  const turnstileOk = await verifyTurnstile({
    token: typeof turnstileToken === "string" ? turnstileToken : null,
    ip: clientIpFromHeaders(),
  });
  if (!turnstileOk) {
    return { error: "Please complete the verification challenge." };
  }

  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email." };
  }
  const passwordResult = PasswordSchema.safeParse(formData.get("password"));
  if (!passwordResult.success) {
    return { error: passwordResult.error.issues[0]?.message ?? "Invalid password." };
  }
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: emailResult.data,
    password: passwordResult.data,
    options: { data: { name } },
  });
  if (error) return { error: friendlyAuthError(error.message) };

  // If email confirmation is enabled, Supabase returns a user but no
  // session — sending them to /dashboard would just bounce them back to
  // /login with no explanation. Route them to the dedicated verify-email
  // page, which knows how to resend the confirmation if it gets lost.
  if (data.user && !data.session) {
    redirect(`/verify-email?email=${encodeURIComponent(emailResult.data)}`);
  }

  // Same `next`-honoring logic as sign-in — keeps the post-signup landing
  // truthful to where the user came from (e.g. forking the demo).
  const next = safeNextPath(formData.get("next") as string | null);
  redirect(next);
}

export async function signInWithGoogle(
  next?: string | null,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Google sign-in isn't configured yet. Add Supabase keys to .env.local.",
    };
  }

  const supabase = createClient();
  // Three-step OAuth dance:
  //  1. We ask Supabase for the provider's authorization URL (this call).
  //  2. We redirect the browser to Google.
  //  3. Google redirects back to /auth/callback with a `code` param, which
  //     the callback route handler exchanges for a session.
  // Thread `next` through as a query param on the callback URL so the
  // callback's existing safeNextPath path-validation handles it.
  const safeNext = safeNextPath(next ?? null);
  const callbackBase = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`;
  const callback =
    safeNext === "/dashboard"
      ? callbackBase
      : `${callbackBase}?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback },
  });
  if (error) return { error: friendlyAuthError(error.message) };
  if (data?.url) redirect(data.url);
  return {};
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ─── Password reset ─────────────────────────────────────────────────────────

/**
 * Step 1 of the password reset flow.
 *
 * Sends a recovery email that links back to /auth/callback with a `next`
 * pointing at /auth/reset-password. The callback route exchanges the code
 * for a session, then forwards the user to the reset-password form, which
 * is signed-in (briefly) just for the purpose of calling `updateUser`.
 *
 * We intentionally return success even when the email is unknown. Anything
 * else would leak which addresses are registered — a small but real
 * privacy / enumeration concern.
 */
export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error: "Password reset isn't configured yet. Add Supabase keys to .env.local.",
    };
  }

  const limited = await rateLimited("passwordReset");
  if (limited) return limited;

  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email." };
  }

  const supabase = createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?next=/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(emailResult.data, {
    redirectTo,
  });
  // Swallow "user not found" — see comment above. Other errors (rate limit,
  // service down) still surface.
  if (error && !/not\s*found|invalid email/i.test(error.message)) {
    return { error: friendlyAuthError(error.message) };
  }
  return {};
}

/**
 * Step 2 of the password reset flow. The user is already signed in (via the
 * recovery code exchange in /auth/callback). All we do here is update the
 * password and bounce to the dashboard.
 */
export async function updatePassword(
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet." };
  }

  const passwordResult = PasswordSchema.safeParse(formData.get("password"));
  if (!passwordResult.success) {
    return { error: passwordResult.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = createClient();
  // updateUser uses the current session. If the recovery code didn't
  // actually produce a session, this returns an auth error.
  const { error } = await supabase.auth.updateUser({
    password: passwordResult.data,
  });
  if (error) return { error: friendlyAuthError(error.message) };

  redirect("/dashboard");
}

// ─── Email confirmation ─────────────────────────────────────────────────────

export async function resendConfirmationEmail(
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Authentication isn't configured yet." };
  }

  const limited = await rateLimited("resendConfirmation");
  if (limited) return limited;

  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Invalid email." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: emailResult.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback`,
    },
  });
  if (error) return { error: friendlyAuthError(error.message) };
  return {};
}
