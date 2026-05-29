"use client";

/**
 * Root error boundary.
 *
 * Next.js will mount this if an error escapes EVERY other error.tsx in the
 * tree — including the root layout. Because the root layout itself failed,
 * we have to render <html> + <body> here ourselves.
 *
 * Keep this file dependency-light: no Tailwind config classes that the
 * compiled CSS might have skipped, no shared layout components that could
 * fail again. The point is to ALWAYS render *something*.
 */

import * as React from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    console.error("[global] error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0a0a",
          color: "#fafafa",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 8 }}>
            Orqestra
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Something broke unexpectedly
          </h1>
          <p style={{ marginTop: 12, lineHeight: 1.55, opacity: 0.7 }}>
            We&apos;ve been notified. Try reloading — if it keeps happening,
            email{" "}
            <a
              href="mailto:hello@orqestra.ai"
              style={{ color: "#fafafa", textDecoration: "underline" }}
            >
              hello@orqestra.ai
            </a>
            .
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                opacity: 0.5,
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#fafafa",
              color: "#0a0a0a",
              border: 0,
              borderRadius: 6,
              padding: "10px 18px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
