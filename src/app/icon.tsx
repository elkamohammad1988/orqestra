import { ImageResponse } from "next/og";

/**
 * Favicon — generated at build/request time via Next's ImageResponse.
 *
 * Renders the three-node Orqestra mark inverted on a dark background. We
 * use Next's app/icon convention (instead of a static /public/favicon.ico)
 * so the mark stays in lockstep with the in-app Logo component — one
 * source of truth.
 */

// Edge runtime — avoids a `fileURLToPath` bug in @vercel/og's Node build
// that breaks the icon prerender on Windows.
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0a0b",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="6" cy="6" r="2.6" fill="currentColor" />
          <circle cx="18" cy="6" r="2.6" fill="currentColor" />
          <circle cx="12" cy="18" r="2.6" fill="currentColor" />
          <path
            d="M6 6 L12 18 M18 6 L12 18 M6 6 L18 6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
