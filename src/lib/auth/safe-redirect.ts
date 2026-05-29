/**
 * Open-redirect guard.
 *
 * `next` params on /login and /auth/callback can be set to anything the
 * caller likes. Without validation, an attacker can craft a link like:
 *
 *     /auth/callback?code=…&next=//evil.com/steal-cookie
 *
 * which redirects the just-authenticated user to a phishing page, with
 * their session cookies along for the ride.
 *
 * Rule: a redirect target is safe only if it's a path on OUR origin. We
 * accept relative paths starting with a single "/" and explicitly reject:
 *   • Protocol-relative URLs ("//evil.com")
 *   • Absolute URLs ("https://evil.com")
 *   • Backslash variants Windows browsers used to normalize ("/\\evil.com")
 *   • Empty / non-string values
 *
 * Returns the safe target, or the fallback if the input is unsafe.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  // Must start with exactly one forward slash, NOT two (// is protocol-
  // relative) and NOT followed by a backslash (legacy normalization quirk).
  if (next[0] !== "/" || next[1] === "/" || next[1] === "\\") return fallback;
  // Reject anything that looks like a URL scheme even without leading slash.
  if (/^\/?[a-z][a-z0-9+.-]*:/i.test(next)) return fallback;
  return next;
}
