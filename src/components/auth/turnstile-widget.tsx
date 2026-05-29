"use client";

/**
 * Cloudflare Turnstile widget — env-gated.
 *
 * Renders the challenge ONLY when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set.
 * Returns null otherwise, so the auth forms work identically with or
 * without the env vars in place.
 *
 * The widget injects a hidden `<input name="cf-turnstile-response">` into
 * its enclosing form. The auth server actions read that field and verify
 * the token via `verifyTurnstile()` before doing anything sensitive.
 */

import * as React from "react";
import Script from "next/script";

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;

  return (
    <>
      <Script src={TURNSTILE_SRC} strategy="afterInteractive" async defer />
      <div
        className="cf-turnstile mt-2"
        data-sitekey={siteKey}
        data-theme="auto"
        data-size="flexible"
      />
    </>
  );
}
