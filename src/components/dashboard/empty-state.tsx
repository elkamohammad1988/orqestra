"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, ArrowRight, Sparkles, Zap, Wand2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WorkflowEmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative grid gap-12 px-6 py-14 sm:px-12 sm:py-20 lg:grid-cols-2 lg:items-center">
        {/* Copy */}
        <div className="max-w-md">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Welcome to Orqestra
          </div>
          <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            See it run first.
          </h2>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted-foreground">
            The demo workflow is a fully wired Customer Feedback Router —
            open it, hit Run, and watch Claude stream a real classification
            in seconds. Then fork it into your workspace.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/workflows/demo">
              <Button size="lg" className="rounded-md">
                <Play className="fill-current" />
                Open the live demo
              </Button>
            </Link>
            <Link href="/workflows/new">
              <Button
                size="lg"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus />
                Start from scratch
              </Button>
            </Link>
          </div>

          {/* Inline first-run checklist — gives the visitor a clear three-
              step story for their first 30 seconds in the product. */}
          <ol className="mt-8 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Open the demo workflow on the canvas",
              "Hit Run — watch Claude stream tokens into the AI step",
              "Fork it as a template to make it your own",
            ].map((item, i) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background font-mono text-[10px] font-semibold text-foreground">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>

          <p className="mt-6 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
            No credit card, no setup — the demo runs against the same engine
            your real workflows will.
          </p>
        </div>

        {/* Mini illustration */}
        <div className="relative hidden lg:block">
          <div className="relative mx-auto h-72 w-full max-w-md">
            <FloatingNode
              icon={Zap}
              label="Trigger"
              className="absolute left-0 top-6 w-44"
              delay={0.3}
            />
            <FloatingNode
              icon={Sparkles}
              label="AI Step"
              accent
              className="absolute left-28 top-28 w-48"
              delay={0.45}
            />
            <FloatingNode
              icon={Wand2}
              label="Output"
              className="absolute right-0 top-52 w-44"
              delay={0.6}
            />
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 400 288"
              fill="none"
              aria-hidden
            >
              <path
                d="M 110 60 C 150 60, 150 140, 220 140"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
              />
              <path
                d="M 280 156 C 320 156, 320 240, 380 240"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FloatingNode({
  icon: Icon,
  label,
  className,
  delay = 0,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  className?: string;
  delay?: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 shadow-elevation-2 ${className ?? ""}`}
    >
      <div
        className={`grid h-7 w-7 place-items-center rounded-md ${
          accent ? "bg-foreground text-background" : "bg-muted text-foreground"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-[13px] font-medium text-foreground">{label}</div>
    </motion.div>
  );
}
