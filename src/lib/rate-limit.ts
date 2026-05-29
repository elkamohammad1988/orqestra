/**
 * Durable rate limiter.
 *
 * ── PRIMARY: Upstash Redis (sliding window) ─────────────────────────────────
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, we route
 * every check through @upstash/ratelimit. State lives in Redis, so counters
 * survive serverless cold starts AND coordinate across instances — that's
 * what protects the AI-billing surface from a sustained attacker.
 *
 * ── FALLBACK: in-memory (dev / preview without Upstash) ─────────────────────
 * No Redis configured = single-process sliding window in a Map. Fine for
 * local dev. Documented in README as "production needs Upstash".
 *
 * ── NAMED POLICIES ──────────────────────────────────────────────────────────
 * Different surfaces have different abuse profiles:
 *
 *   run      | 8/60s   | signed-in users running their own workflows
 *   demo     | 4/60s   | anonymous IPs hitting the public demo endpoint
 *   webhook  | 20/60s  | per-workflow external triggers
 *   auth     | 5/10m   | sign-in/sign-up/reset — the brute-force surface
 *   upgrade  | 5/60s   | UpgradeDialog submissions
 *
 * Adjustment lives in one place (POLICIES). Callers pick the right name;
 * keying (user_id vs IP) is the caller's job — see the helpers below.
 */

import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// ─── Policies ───────────────────────────────────────────────────────────────

export type LimiterName =
  | "run"
  | "demo"
  | "webhook"
  | "auth"
  | "upgrade";

// Window strings follow @upstash/ratelimit's Duration grammar.
const POLICIES: Record<
  LimiterName,
  { tokens: number; windowMs: number; window: Parameters<typeof Ratelimit.slidingWindow>[1] }
> = {
  run:     { tokens: 8,  windowMs: 60_000,  window: "60 s" },
  demo:    { tokens: 4,  windowMs: 60_000,  window: "60 s" },
  webhook: { tokens: 20, windowMs: 60_000,  window: "60 s" },
  auth:    { tokens: 5,  windowMs: 600_000, window: "10 m" },
  upgrade: { tokens: 5,  windowMs: 60_000,  window: "60 s" },
};

// ─── Upstash setup (lazy) ───────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  return Redis.fromEnv();
}

let _limiters: Record<LimiterName, Ratelimit> | null | undefined;
function getLimiters(): Record<LimiterName, Ratelimit> | null {
  if (_limiters !== undefined) return _limiters;
  const redis = getRedis();
  if (!redis) {
    _limiters = null;
    return null;
  }
  _limiters = {
    run: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(POLICIES.run.tokens, POLICIES.run.window), prefix: "orq:run" }),
    demo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(POLICIES.demo.tokens, POLICIES.demo.window), prefix: "orq:demo" }),
    webhook: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(POLICIES.webhook.tokens, POLICIES.webhook.window), prefix: "orq:wh" }),
    auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(POLICIES.auth.tokens, POLICIES.auth.window), prefix: "orq:auth" }),
    upgrade: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(POLICIES.upgrade.tokens, POLICIES.upgrade.window), prefix: "orq:upgrade" }),
  };
  return _limiters;
}

// ─── In-memory fallback ─────────────────────────────────────────────────────

const memBuckets = new Map<string, number[]>();

function memCheck(
  policy: { tokens: number; windowMs: number },
  fullKey: string,
): RateLimitResult {
  const now = Date.now();
  const recent = (memBuckets.get(fullKey) || []).filter(
    (t) => now - t < policy.windowMs,
  );
  if (recent.length >= policy.tokens) {
    const oldest = recent[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + policy.windowMs - now);
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil(retryAfterMs / 1000),
    };
  }
  recent.push(now);
  memBuckets.set(fullKey, recent);
  return {
    success: true,
    remaining: policy.tokens - recent.length,
    retryAfter: 0,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Seconds until the next slot frees up. 0 when allowed. */
  retryAfter: number;
}

/**
 * Check + record a rate-limit hit for the named policy.
 *
 * `key` should identify the caller (user id, IP, or a composite like
 * `workflowId` for per-workflow webhook limits). The function namespaces
 * the key per policy automatically — callers shouldn't pass the same key
 * to two policies expecting independent counters.
 */
export async function checkRateLimit(
  name: LimiterName,
  key: string,
): Promise<RateLimitResult> {
  const policy = POLICIES[name];
  const limiters = getLimiters();

  if (limiters) {
    // Upstash returns { success, remaining, reset } — translate to our shape.
    const r = await limiters[name].limit(key);
    const retryAfter = r.success
      ? 0
      : Math.max(0, Math.ceil((r.reset - Date.now()) / 1000));
    return { success: r.success, remaining: r.remaining, retryAfter };
  }

  return memCheck(policy, `${name}:${key}`);
}

// ─── Key helpers ────────────────────────────────────────────────────────────

/**
 * Pull a stable rate-limit key from a Request. Prefer user id when present,
 * fall back to forwarded IP. Used by API route handlers.
 */
export function rateLimitKey(
  request: Request,
  userId: string | null,
): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "anon";
  return `ip:${ip}`;
}

/**
 * Server-action variant of `rateLimitKey`. Server actions don't receive a
 * Request directly; Next exposes per-request headers via `next/headers`.
 * `server-only` at the top of this module enforces server-only usage at
 * build time.
 */
export function rateLimitKeyFromHeaders(userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = headers().get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "anon";
  return `ip:${ip}`;
}
