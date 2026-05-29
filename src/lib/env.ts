/**
 * Environment access — typed and named.
 *
 * Design notes:
 *   • Reads are lazy (inside functions) so the marketing landing can boot
 *     for a visitor even when keys aren't set yet. Only code paths that
 *     actually need a key fail.
 *   • `requireEnv()` always throws a NAMED error mentioning the exact key
 *     and the file to set it in — partial configs surface clearly instead
 *     of producing a cryptic Supabase or Anthropic stack trace deep in a
 *     request.
 *   • `assertProductionEnv()` is the boot-time invariant check. Imported
 *     once from a server-only path so production deploys fail fast at
 *     startup if a key is missing.
 */

type EnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "ANTHROPIC_API_KEY"
  | "NEXT_PUBLIC_APP_URL"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "TURNSTILE_SECRET_KEY"
  | "NEXT_PUBLIC_TURNSTILE_SITE_KEY";

export function getEnv(key: EnvKey): string | undefined {
  return process.env[key];
}

/** Throw a clear, actionable error if a required key is missing. */
export function requireEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Orqestra] Missing required environment variable: ${key}.\n` +
        `Add it to your .env.local file. See .env.local.example for reference.`,
    );
  }
  return value;
}

/**
 * Used as a soft check before code that *can* run without Supabase wants to
 * know whether the real backend is wired in. Examples: the middleware skips
 * session refresh when false; the dashboard layout falls back to a mock user.
 */
export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

// ─── Boot-time invariants ───────────────────────────────────────────────────

/**
 * Keys that MUST be present in production. Anything else (Upstash,
 * Turnstile) degrades gracefully — log a warning so the operator notices.
 */
const PROD_REQUIRED: EnvKey[] = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const PROD_RECOMMENDED: EnvKey[] = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

/**
 * Verify the production env. Call once from a server-only boot path
 * (e.g. a server component imported by the root layout). Throws on
 * missing required keys; only warns on missing recommended keys.
 *
 * Skipped during:
 *   • Local dev (`NODE_ENV !== "production"`).
 *   • Next's production BUILD phase — page-data collection imports server
 *     code without env vars set, and we don't want a missing key to fail
 *     the build itself. The check fires on the first real request instead.
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  // During `next build`, NEXT_PHASE === "phase-production-build". The
  // build host typically has no runtime secrets — those land on the
  // serving instance, which fires this check on cold start.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const missing: EnvKey[] = PROD_REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[Orqestra] Production startup aborted — missing env vars:\n` +
        missing.map((k) => `  • ${k}`).join("\n") +
        `\nSet these in your hosting provider's environment configuration.`,
    );
  }

  const softMissing = PROD_RECOMMENDED.filter((k) => !process.env[k]);
  if (softMissing.length > 0) {
    console.warn(
      `[Orqestra] Production env is missing recommended vars:\n` +
        softMissing.map((k) => `  • ${k}`).join("\n") +
        `\nRate limiting will fall back to in-memory (per-instance) without these.`,
    );
  }
}
