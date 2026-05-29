/**
 * Cloudflare Turnstile verification — env-gated.
 *
 * Strategy: wire the integration end-to-end so flipping the keys on in
 * production is zero-code. If `TURNSTILE_SECRET_KEY` isn't set, every
 * verify call returns true (no-op pass-through). The widget on the form
 * is gated separately by `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, so we never
 * render the challenge in an environment where it can't be verified.
 *
 * This file is server-only. The client widget lives in
 * `components/auth/turnstile-widget.tsx`.
 */

import "server-only";

import { headers } from "next/headers";

export function isTurnstileEnabled(): boolean {
  return !!(
    process.env.TURNSTILE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
}

interface VerifyTurnstileInput {
  token: string | null | undefined;
  ip: string | null;
}

/**
 * Verify a Turnstile token with Cloudflare's siteverify endpoint.
 * Returns true if the challenge passed OR if Turnstile isn't configured —
 * keep call sites tidy by treating "disabled" as "pass".
 */
export async function verifyTurnstile({
  token,
  ip,
}: VerifyTurnstileInput): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token) return false;

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip ?? undefined,
        }),
      },
    );
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.warn("[turnstile] verification failed:", err);
    return false;
  }
}

/** Pulls the forwarded client IP — useful as the `ip` arg above. */
export function clientIpFromHeaders(): string | null {
  const forwarded = headers().get("x-forwarded-for") ?? "";
  return forwarded.split(",")[0]?.trim() || null;
}
