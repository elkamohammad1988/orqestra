/**
 * Security headers applied to every response.
 *
 * What's here and why:
 *   • HSTS — forces HTTPS on every subsequent visit. The `preload` flag
 *     opts us in to browser-bundled HSTS lists eventually; safe because
 *     we don't serve anything over plain HTTP.
 *   • X-Content-Type-Options: nosniff — stops browsers from second-
 *     guessing the Content-Type we declare. Cheap insurance against
 *     MIME-confusion attacks on uploaded content.
 *   • X-Frame-Options: DENY — disables embedding in iframes. Removes the
 *     clickjacking surface entirely; we don't ship any features that
 *     need to be framed.
 *   • Referrer-Policy: strict-origin-when-cross-origin — leak the origin
 *     but never the path/query to third parties. The Next default.
 *   • Permissions-Policy — explicitly turn off browser features we
 *     never request (camera, mic, geolocation). Smaller attack surface
 *     for any compromised third-party script.
 *
 * What's NOT here:
 *   • Content-Security-Policy — React Flow and framer-motion inject
 *     inline styles, which a strict CSP would block. Wiring this is a
 *     post-launch follow-up: roll it out report-only first.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
