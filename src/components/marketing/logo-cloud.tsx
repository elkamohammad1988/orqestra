"use client";

/**
 * Infrastructure credibility strip.
 *
 * Previously this section displayed six invented company wordmarks
 * ("Northwind", "Helix", "Quantel", etc.) which read as template
 * filler the moment anyone looked twice. Fake social proof is the
 * single most damaging trust signal a SaaS landing page can carry,
 * so we replace it with the actual production infrastructure stack —
 * something we *can* defend, and that doubles as a technical signal
 * for the engineering audience this product targets.
 */

import { motion } from "framer-motion";

const stack = [
  {
    name: "Anthropic",
    role: "Claude models for every AI step",
    mark: AnthropicMark,
  },
  {
    name: "Supabase",
    role: "Postgres with row-level security",
    mark: SupabaseMark,
  },
  {
    name: "Next.js",
    role: "App router + server actions",
    mark: NextMark,
  },
  {
    name: "Vercel",
    role: "Streaming runtime + edge delivery",
    mark: VercelMark,
  },
  {
    name: "Cloudflare",
    role: "Turnstile bot protection",
    mark: CloudflareMark,
  },
];

export function LogoCloud() {
  return (
    <section className="border-y border-border/60 bg-muted/30 py-16">
      <div className="container">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
        >
          Built on the same stack your production AI runs on
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5"
        >
          {stack.map((item) => {
            const Mark = item.mark;
            return (
              <li
                key={item.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground">
                  <Mark />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                    {item.name}
                  </div>
                  <div className="truncate text-[11.5px] text-muted-foreground">
                    {item.role}
                  </div>
                </div>
              </li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

// ─── Stack marks ─────────────────────────────────────────────────────────────
// Monochrome glyph-style marks so the strip reads as one composed row rather
// than five vendors competing for color attention.

function AnthropicMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M14.42 4h3.95L24 20h-3.96l-1.16-3h-6.92l-1.16 3H6.84L12.47 4h1.95zM13.4 7.27l-2.27 5.87h4.55L13.4 7.27zM3.96 4H0v16h3.96V4z" />
    </svg>
  );
}

function SupabaseMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M13.83 22.25a1.06 1.06 0 0 1-1.88-.68v-7.06H4.51a1.06 1.06 0 0 1-.82-1.74L11.21 3.6a1.06 1.06 0 0 1 1.88.68v7.06h7.44a1.06 1.06 0 0 1 .82 1.74l-7.52 9.17z" />
    </svg>
  );
}

function NextMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 0a12 12 0 1 0 6.39 22.16L7.5 7.5v9h1.5v-6l9.18 13.18A12 12 0 0 0 12 0zm3 7.5h1.5v9H15v-9z" />
    </svg>
  );
}

function VercelMark() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <path d="M12 2 24 22H0L12 2z" />
    </svg>
  );
}

function CloudflareMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M16.5 16H6.7a3.7 3.7 0 1 1 1.3-7.18 5 5 0 0 1 9.6 1.36A3.4 3.4 0 0 1 16.5 16z" />
    </svg>
  );
}
