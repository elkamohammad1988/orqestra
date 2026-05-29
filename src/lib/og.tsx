import { ImageResponse } from "next/og";

/**
 * Shared renderer for the marketing-wide OG card.
 *
 * Used by both `app/opengraph-image.tsx` and `app/twitter-image.tsx` so
 * the two surfaces stay visually identical. Next's static analyzer
 * requires `runtime`, `alt`, `size`, and `contentType` exports to be
 * literal — re-exporting them from one file to another loses the
 * literal-ness and breaks the build. So each file declares the literals
 * locally and just delegates the actual render to this helper.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export function renderOgCard(): Promise<ImageResponse> | ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "radial-gradient(ellipse at 75% 30%, rgba(124, 58, 237, 0.18) 0%, rgba(10, 10, 11, 0) 55%), #0a0a0b",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Subtle dot grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.55,
          }}
        />

        {/* Top — logo lockup */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: "#ffffff",
              color: "#0a0a0b",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="6" cy="6" r="2.4" fill="currentColor" />
              <circle cx="18" cy="6" r="2.4" fill="currentColor" />
              <circle cx="12" cy="18" r="2.4" fill="currentColor" />
              <path
                d="M6 6 L12 18 M18 6 L12 18 M6 6 L18 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Orqestra
          </div>
        </div>

        {/* Main — headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 96,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: "#10b981",
                borderRadius: 999,
                marginRight: 10,
              }}
            />
            AI workflow orchestration
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
              marginTop: 26,
            }}
          >
            Visual orchestration
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            for production AI.
          </div>
        </div>

        {/* Bottom — stack credibility row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "auto",
            paddingTop: 56,
            position: "relative",
            color: "rgba(255,255,255,0.5)",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.005em",
          }}
        >
          <span>Built on Claude, Supabase, Next.js, Vercel</span>
          <span
            style={{
              marginLeft: 18,
              marginRight: 18,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            ·
          </span>
          <span>Streaming runs in seconds</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
