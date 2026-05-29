"use client";

import { motion } from "framer-motion";
import {
  Workflow,
  Eye,
  ShieldCheck,
  History,
  Webhook,
  Boxes,
  Zap,
  Sparkles,
  Wand2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/ui/sparkline";

const features = [
  {
    icon: Workflow,
    title: "Visual canvas",
    description:
      "Drag, connect, branch. Compose orchestrated AI flows without writing glue code.",
    span: "md:col-span-2",
    visual: "canvas",
  },
  {
    icon: Boxes,
    title: "Composable nodes",
    description:
      "Triggers, AI calls, transforms, and outputs. Each one is reusable and strictly typed.",
    span: "md:col-span-1",
    visual: "blocks",
  },
  {
    icon: Eye,
    title: "Live observability",
    description:
      "Stream tokens straight from Claude. Watch every node fire in the editor as it runs.",
    span: "md:col-span-1",
    visual: "stream",
  },
  {
    icon: History,
    title: "Replayable history",
    description:
      "Every run captures the full event log. Open any past execution and walk through it node by node.",
    span: "md:col-span-2",
    visual: "git",
  },
  {
    icon: Webhook,
    title: "Webhook triggers",
    description:
      "Every workflow gets a unique POST endpoint. Wire it to Slack, your backend, or any external system.",
    span: "md:col-span-2",
    visual: "latency",
  },
  {
    icon: ShieldCheck,
    title: "Isolated at the database",
    description:
      "Row-level security in Postgres scopes every query to its owner. Cross-tenant leaks aren't possible.",
    span: "md:col-span-1",
    visual: "lock",
  },
] as const;

export function Features() {
  return (
    <section id="features" className="relative py-28 sm:py-36">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              The platform
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[44px] lg:leading-[1.05]">
              Built for the work you actually ship.
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-[17px]">
              Replace the brittle scripts and one-off notebooks. One canvas for
              design, one engine for execution, one timeline for everything that
              ran today.
            </p>
          </motion.div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-foreground/15 hover:shadow-elevation-2",
        feature.span,
      )}
    >
      {/* Inline visualization area */}
      <div className="relative h-[140px] overflow-hidden border-b border-border/60 bg-muted/20">
        <FeatureVisual variant={feature.visual} />
      </div>

      {/* Text body */}
      <div className="flex-1 p-6">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background shadow-elevation-1">
          <Icon className="h-[17px] w-[17px] text-foreground" />
        </div>
        <h3 className="mt-5 text-[17px] font-semibold tracking-tight text-foreground">
          {feature.title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Inline visualizations ──────────────────────────────────────────────────

function FeatureVisual({ variant }: { variant: string }) {
  if (variant === "canvas") return <CanvasVisual />;
  if (variant === "blocks") return <BlocksVisual />;
  if (variant === "stream") return <StreamVisual />;
  if (variant === "git") return <GitVisual />;
  if (variant === "latency") return <LatencyVisual />;
  if (variant === "lock") return <LockVisual />;
  return null;
}

function CanvasVisual() {
  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 140">
        <path
          d="M 80 50 C 130 50, 130 90, 180 90"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 220 90 C 270 90, 270 50, 320 50"
          stroke="hsl(var(--brand-500))"
          strokeWidth="1.5"
          strokeOpacity="0.7"
          fill="none"
          className="flow-line"
        />
      </svg>
      <MiniNode className="absolute left-[12%] top-[28%]" label="Trigger" />
      <MiniNode className="absolute left-[42%] top-[55%]" label="Classify" active />
      <MiniNode className="absolute right-[12%] top-[28%]" label="Output" />
    </div>
  );
}

function BlocksVisual() {
  // The four kinds match what the editor's node library and run engine
  // actually support — keep this list in sync with WorkflowNodeKind in
  // src/types/index.ts so the marketing card doesn't drift from reality.
  const kinds = [
    { icon: Zap, label: "Trigger", accent: false },
    { icon: Sparkles, label: "AI Step", accent: true },
    { icon: Wand2, label: "Transform", accent: false },
    { icon: Send, label: "Output", accent: false },
  ];
  return (
    <div className="grid h-full grid-cols-2 gap-2 p-4">
      {kinds.map((k, i) => {
        const Icon = k.icon;
        return (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="flex items-center gap-2 rounded-lg border border-border bg-background/80 px-2.5 py-2 shadow-elevation-1"
          >
            <div
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-md",
                k.accent
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            <span className="truncate font-mono text-[11px] text-foreground">
              {k.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

function StreamVisual() {
  return (
    <div className="flex h-full flex-col justify-end p-4 font-mono text-[10.5px] leading-relaxed">
      <div className="text-muted-foreground">
        <span className="text-emerald-500 dark:text-emerald-400">✓</span> tokens: 142
      </div>
      <div className="text-muted-foreground">
        <span className="text-emerald-500 dark:text-emerald-400">✓</span> latency: 412ms
      </div>
      <div className="text-foreground">
        <span className="text-brand-500">↳</span> classify: <span className="type-cursor">bug</span>
      </div>
    </div>
  );
}

function GitVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden p-4">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 140">
        <line x1="60" y1="20" x2="60" y2="120" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <line x1="60" y1="60" x2="160" y2="60" stroke="hsl(var(--border))" strokeWidth="1.5" />
        <line x1="160" y1="60" x2="160" y2="100" stroke="hsl(var(--border))" strokeWidth="1.5" />
      </svg>
      {[
        { x: 60, y: 20, label: "run · 12s", current: false },
        { x: 60, y: 60, label: "run · 2m", current: false },
        { x: 160, y: 60, label: "run · 4m", current: false },
        { x: 60, y: 100, label: "run · 14m", current: false },
        { x: 160, y: 100, label: "live now", current: true },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute flex items-center gap-2"
          style={{ left: c.x - 6, top: c.y - 6 }}
        >
          <div
            className={cn(
              "h-3 w-3 rounded-full border-2",
              c.current
                ? "border-brand-500 bg-brand-500"
                : "border-border bg-card",
            )}
          />
          <span className="font-mono text-[10px] text-muted-foreground">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function LatencyVisual() {
  const data = [820, 740, 690, 650, 720, 580, 540, 510, 490, 460, 420, 410, 380, 360];
  return (
    <div className="relative h-full w-full p-4">
      <div className="absolute left-4 top-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
        <span className="rounded bg-emerald-500/10 px-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
          POST
        </span>
        /api/webhooks/…
      </div>
      <div className="absolute right-4 top-3 flex items-baseline gap-1.5 font-mono">
        <span className="text-2xl font-semibold tracking-tight text-foreground nums">
          412
        </span>
        <span className="text-[11px] text-muted-foreground">ms</span>
      </div>
      <div className="absolute inset-x-4 bottom-3">
        <Sparkline
          data={data}
          width={300}
          height={50}
          color="hsl(var(--foreground))"
          className="w-full"
        />
      </div>
    </div>
  );
}

function LockVisual() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative">
        <div className="grid h-14 w-14 place-items-center rounded-xl border border-border bg-background shadow-elevation-2">
          <ShieldCheck className="h-5 w-5 text-foreground" />
        </div>
        <div className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-md bg-foreground font-mono text-[9px] font-bold text-background">
          RLS
        </div>
      </div>
    </div>
  );
}

function MiniNode({
  label,
  className,
  active = false,
}: {
  label: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border bg-background px-2 py-1 text-[10px] shadow-elevation-1",
        active
          ? "border-brand-500/40 ring-2 ring-brand-500/15"
          : "border-border",
        className,
      )}
    >
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-brand-500" : "bg-foreground",
        )}
      />
      <span className="font-mono text-foreground">{label}</span>
    </div>
  );
}
