"use client";

import { motion } from "framer-motion";
import { Sparkles, Zap, Wand2, Send, ShieldCheck, Activity, Webhook } from "lucide-react";

/**
 * The visual side of the split-screen auth layout.
 *
 * Inverted color scheme, single soft glow, a live-looking mini workflow,
 * and three honest product properties at the bottom. The previous design
 * carried an invented customer quote ("Elena Marlowe · Northwind Labs")
 * which read as template filler — fake social proof on an auth page is a
 * trust signal in the wrong direction. We swap it for three statements
 * the product can actually back up today.
 */
export function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden bg-foreground lg:block">
      {/* Subtle grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 70% 30%, black 25%, transparent 75%)",
        }}
      />

      {/* Brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/4 h-[560px] w-[560px] blur-3xl"
      >
        <div
          className="h-full w-full opacity-25"
          style={{
            background:
              "radial-gradient(circle at center, hsl(var(--brand-500)) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative flex h-full flex-col p-12 text-background">
        {/* Top — tiny in-app pill */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-background/15 bg-background/5 px-2.5 py-1 text-[11px] font-medium text-background/70 backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          orqestra.ai · live in production
        </motion.div>

        <div className="flex-1" />

        {/* Stylized workflow visualization */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-md"
        >
          <div className="space-y-2.5">
            <NodeRow
              icon={Zap}
              label="On new lead"
              sublabel="webhook · /hubspot"
              status="done"
              meta="0.02s"
            />
            <NodeRow
              icon={Sparkles}
              label="Enrich with Claude"
              sublabel="claude-3-5-sonnet"
              status="done"
              meta="0.41s"
            />
            <NodeRow
              icon={Wand2}
              label="Score & route"
              sublabel="streaming…"
              status="running"
              meta="142 tok"
            />
            <NodeRow
              icon={Send}
              label="Push to CRM"
              sublabel="queued"
              status="queued"
              meta="—"
            />
          </div>
        </motion.div>

        <div className="flex-1" />

        <motion.ul
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid max-w-md gap-3"
        >
          {[
            {
              icon: Activity,
              title: "Streaming-first execution",
              body: "Token-level visibility into every Claude call as it runs.",
            },
            {
              icon: ShieldCheck,
              title: "Database-level isolation",
              body: "Postgres row-level security scopes every query to its owner.",
            },
            {
              icon: Webhook,
              title: "A webhook for every workflow",
              body: "Token-authenticated POST endpoints out of the box.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-background/10 bg-background/[0.04] px-4 py-3 backdrop-blur"
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-background/10 text-background">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-background">
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-background/60">
                    {item.body}
                  </div>
                </div>
              </li>
            );
          })}
        </motion.ul>
      </div>
    </div>
  );
}

function NodeRow({
  icon: Icon,
  label,
  sublabel,
  status,
  meta,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  status: "done" | "running" | "queued";
  meta: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-background/[0.04] px-3.5 py-2.5 backdrop-blur ${
        status === "running"
          ? "border-brand-400/40 ring-1 ring-brand-400/15"
          : "border-background/10"
      }`}
    >
      <div className="grid h-8 w-8 place-items-center rounded-md bg-background/10">
        <Icon className="h-4 w-4 text-background" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-background">{label}</div>
        <div className="font-mono text-[10.5px] text-background/50">
          {sublabel}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-background/40">{meta}</span>
        {status === "done" && (
          <div className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400/20">
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-emerald-400">
              <path
                d="M3 6L5 8L9 4"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
        {status === "running" && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
          </span>
        )}
        {status === "queued" && (
          <span className="h-2 w-2 rounded-full border border-background/20" />
        )}
      </div>
    </div>
  );
}
