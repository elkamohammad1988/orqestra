"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Sparkles,
  Wand2,
  Send,
  Play,
  GitBranch,
  Search,
  Layers,
  Settings2,
  ChevronRight,
  Maximize2,
  Minus,
  Plus as PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The premium hero showpiece — a static, animated mock of the workflow editor.
 * Three-column layout (library / canvas / inspector) with a bottom output console.
 * Hides side rails on small screens to keep the canvas readable.
 */
export function WorkflowPreview() {
  return (
    <div className="relative">
      {/* App window chrome */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-4 noise">
        <WindowTopbar />

        <div className="flex h-[520px] sm:h-[560px]">
          <NodeLibrary />
          <Canvas />
          <InspectorPanel />
        </div>

        <OutputConsole />
      </div>

      {/* Soft glow under the window */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-16 -bottom-10 h-32 rounded-full bg-foreground/25 opacity-30 blur-3xl dark:opacity-20"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar
// ─────────────────────────────────────────────────────────────────────────────

function WindowTopbar() {
  return (
    <div className="flex items-center justify-between border-b border-border/80 bg-background/40 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <GitBranch className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-[11px] text-muted-foreground">
            workflows / <span className="text-foreground">customer-feedback-router</span>
          </span>
          <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
            v12
          </span>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            · edited 4m ago
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          LIVE
        </div>
        {/* Decorative chip — this preview is a static screenshot. */}
        <div
          aria-hidden
          className="hidden h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-foreground sm:inline-flex"
        >
          <Settings2 className="h-3 w-3" />
          Configure
        </div>
        <div className="flex h-7 items-center gap-1.5 rounded-md bg-foreground px-3 text-[11px] font-medium text-background shadow-elevation-1">
          <Play className="h-2.5 w-2.5 fill-current" />
          Run
          <kbd className="hidden font-mono text-[9px] opacity-60 sm:inline">⌘↵</kbd>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node library (left rail)
// ─────────────────────────────────────────────────────────────────────────────

// Keep this list in lockstep with the real editor's node library
// (components/flow/node-library.tsx). Advertising kinds the user can't
// drop on the canvas erodes trust the moment they open the demo.
const libraryItems = [
  { icon: Zap, label: "Trigger" },
  { icon: Sparkles, label: "AI Step", active: true },
  { icon: Wand2, label: "Transform" },
  { icon: Send, label: "Output" },
];

function NodeLibrary() {
  return (
    <div className="hidden w-14 shrink-0 flex-col border-r border-border bg-muted/30 py-3 md:flex">
      <div className="flex flex-col items-center gap-1" aria-hidden>
        {libraryItems.map((item, i) => (
          <div
            key={i}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md",
              item.active
                ? "bg-foreground text-background"
                : "text-muted-foreground",
            )}
            title={item.label}
          >
            <item.icon className="h-4 w-4" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-col items-center gap-1 border-t border-border pt-3">
        <div className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground">
          <Layers className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Canvas with nodes + connections
// ─────────────────────────────────────────────────────────────────────────────

function Canvas() {
  return (
    <div className="relative flex-1 overflow-hidden bg-background">
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Floating canvas controls — decorative on the marketing preview. */}
      <div
        aria-hidden
        className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-border bg-background/80 p-1 shadow-elevation-1 backdrop-blur"
      >
        <div className="grid h-6 w-6 place-items-center rounded text-muted-foreground">
          <PlusIcon className="h-3 w-3" />
        </div>
        <div className="grid h-6 w-6 place-items-center rounded text-muted-foreground">
          <Minus className="h-3 w-3" />
        </div>
        <div className="grid h-6 w-6 place-items-center rounded text-muted-foreground">
          <Maximize2 className="h-3 w-3" />
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur">
        100%
      </div>

      {/* Connection SVG */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="flow-active" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--brand-500))" stopOpacity="0.25" />
            <stop offset="50%" stopColor="hsl(var(--brand-500))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--brand-500))" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Trigger → Classify (active, animated) */}
        <path
          d="M 14% 22% C 26% 22%, 26% 50%, 38% 50%"
          stroke="url(#flow-active)"
          strokeWidth="1.6"
          fill="none"
        />
        <path
          d="M 14% 22% C 26% 22%, 26% 50%, 38% 50%"
          stroke="hsl(var(--brand-500))"
          strokeWidth="1.6"
          fill="none"
          strokeOpacity="0.9"
          className="flow-line"
        />

        {/* Classify → Extract (queued, dashed static) */}
        <path
          d="M 60% 50% C 72% 50%, 72% 22%, 84% 22%"
          stroke="hsl(var(--border))"
          strokeWidth="1.4"
          fill="none"
          strokeDasharray="3 5"
        />

        {/* Classify → Format (queued) */}
        <path
          d="M 60% 50% C 72% 50%, 72% 78%, 84% 78%"
          stroke="hsl(var(--border))"
          strokeWidth="1.4"
          fill="none"
          strokeDasharray="3 5"
        />
      </svg>

      {/* Nodes */}
      <NodeCard
        kind="trigger"
        title="Slack message"
        subtitle="On #feedback"
        meta="webhook"
        status="done"
        className="absolute left-[5%] top-[14%] w-[170px]"
        delay={0.4}
      />

      <NodeCard
        kind="ai"
        title="Classify intent"
        subtitle="Claude 3.5 Sonnet"
        meta="streaming"
        status="running"
        selected
        className="absolute left-[39%] top-[42%] w-[210px]"
        delay={0.7}
        tokens={{ used: 142, max: 512 }}
      />

      <NodeCard
        kind="transform"
        title="Extract entities"
        subtitle="JSON · structured"
        meta="queued"
        status="queued"
        className="absolute right-[5%] top-[14%] w-[170px]"
        delay={1.0}
      />

      <NodeCard
        kind="output"
        title="Route to queue"
        subtitle="Linear · auto-tag"
        meta="queued"
        status="queued"
        className="absolute right-[5%] top-[70%] w-[170px]"
        delay={1.15}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node card
// ─────────────────────────────────────────────────────────────────────────────

interface NodeCardProps {
  kind: "trigger" | "ai" | "transform" | "output";
  title: string;
  subtitle: string;
  meta: string;
  status: "done" | "running" | "queued";
  selected?: boolean;
  className?: string;
  delay?: number;
  tokens?: { used: number; max: number };
}

function NodeCard({
  kind,
  title,
  subtitle,
  meta,
  status,
  selected,
  className,
  delay = 0,
  tokens,
}: NodeCardProps) {
  const iconMap = {
    trigger: Zap,
    ai: Sparkles,
    transform: Wand2,
    output: Send,
  };
  const Icon = iconMap[kind];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-xl bg-card/95 backdrop-blur",
        selected
          ? "shadow-elevation-3 ring-2 ring-brand-500/40 ring-offset-2 ring-offset-background"
          : "border border-border shadow-elevation-2",
        className,
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md",
            kind === "ai"
              ? "bg-foreground text-background"
              : "border border-border bg-background text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium leading-tight text-foreground">
            {title}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {subtitle}
          </div>
        </div>
        <StatusIndicator status={status} />
      </div>

      {/* Card body — running shows token progress */}
      {status === "running" && tokens && (
        <div className="border-t border-border/80 px-3 py-2">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-muted-foreground">{meta}</span>
            <span className="text-foreground">
              {tokens.used}<span className="text-muted-foreground"> / {tokens.max}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: "8%" }}
              animate={{ width: `${(tokens.used / tokens.max) * 100}%` }}
              transition={{ delay: delay + 0.3, duration: 1.6, ease: "easeOut" }}
              className="h-full bg-brand-500"
            />
          </div>
        </div>
      )}

      {/* IO ports — visual handles on left/right edges */}
      {kind !== "trigger" && (
        <div className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
      )}
      {kind !== "output" && (
        <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full border border-border bg-background" />
      )}
    </motion.div>
  );
}

function StatusIndicator({ status }: { status: "done" | "running" | "queued" }) {
  if (status === "done") {
    return (
      <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15">
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400">
          <path
            d="M3 6L5 8L9 4"
            stroke="currentColor"
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }
  if (status === "running") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
      </span>
    );
  }
  return <div className="h-2 w-2 shrink-0 rounded-full border border-border" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspector panel (right rail)
// ─────────────────────────────────────────────────────────────────────────────

function InspectorPanel() {
  return (
    <div className="hidden w-[280px] shrink-0 flex-col border-l border-border bg-card/60 lg:flex">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background">
            <Sparkles className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-foreground">
              Classify intent
            </div>
            <div className="font-mono text-[10px] text-muted-foreground">
              ai_step · node_02
            </div>
          </div>
        </div>
      </div>

      {/* Inspector body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Field label="Model">
          <div className="flex h-7 items-center justify-between rounded-md border border-border bg-background px-2 text-[11.5px]">
            <span className="text-foreground">Claude 3.5 Sonnet</span>
            <ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />
          </div>
        </Field>

        <Field label="System prompt">
          <div className="rounded-md border border-border bg-background p-2 font-mono text-[10.5px] leading-relaxed text-foreground">
            You are a customer support classifier. Return JSON with category, priority, and a one-sentence summary.
          </div>
        </Field>

        <Field label="User prompt">
          <div className="rounded-md border border-border bg-background p-2 font-mono text-[10.5px] leading-relaxed text-foreground">
            <span className="text-muted-foreground">{`{{`} trigger.text {`}}`}</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Temp">
            <div className="flex h-7 items-center justify-between rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground">
              0.2
            </div>
          </Field>
          <Field label="Max tokens">
            <div className="flex h-7 items-center justify-between rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground">
              512
            </div>
          </Field>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted-foreground">avg latency</span>
          <span className="text-foreground">412ms</span>
        </div>
        <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted-foreground">success rate</span>
          <span className="text-foreground">99.4%</span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Output console (bottom)
// ─────────────────────────────────────────────────────────────────────────────

const streamingTokens = [
  "Analyzing",
  " the",
  " incoming",
  " message",
  ":",
  " '",
  "Cannot",
  " upload",
  " files",
  " over",
  " 10MB",
  "'",
];

function OutputConsole() {
  const [tokenIndex, setTokenIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTokenIndex((i) => (i + 1) % (streamingTokens.length + 8));
    }, 220);
    return () => clearInterval(interval);
  }, []);

  const visibleTokens = streamingTokens.slice(0, Math.min(tokenIndex, streamingTokens.length));
  const isComplete = tokenIndex >= streamingTokens.length;

  return (
    <div className="hidden border-t border-border bg-muted/20 sm:block">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-1.5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-foreground">
            Output
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            streaming · classify_intent
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span>2.1s</span>
          <Search className="h-3 w-3" />
        </div>
      </div>
      <div className="flex h-[68px] items-start gap-3 px-4 py-2.5">
        <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">↳</span>
        <div className="min-w-0 flex-1 font-mono text-[11.5px] leading-relaxed text-foreground">
          <span className={isComplete ? "" : "type-cursor"}>
            {visibleTokens.join("")}
          </span>
        </div>
      </div>
    </div>
  );
}
