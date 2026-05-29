"use client";

/**
 * Run console — bottom slide-up panel showing live run progress.
 *
 * Visual polish in this pass:
 *  - Per-kind icons in each row so the eye can scan node-types at a glance.
 *  - Auto-scroll to the latest active node so the running row stays visible
 *    even as the log grows.
 *  - Header progress bar reflects done/total — gives a felt sense of speed.
 *  - Smooth height animation on expand/collapse + transparent border so
 *    the panel feels integrated, not bolted on.
 *  - Final state shows elapsed wall time (computed from the moment a run
 *    starts to the moment it transitions out of `isRunning`).
 *
 * Data sources (all unchanged from Phase 3):
 *  - runStatus map → per-node status
 *  - runTokens map → streamed text per AI node
 *  - runOutputs map → final output per node
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Zap,
  Sparkles,
  Wand2,
  Send,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/workflow/types";
import type { WorkflowNodeKind } from "@/types";

export function RunConsole() {
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runStatus = useWorkflowStore((s) => s.runStatus);
  const runTokens = useWorkflowStore((s) => s.runTokens);
  const runOutputs = useWorkflowStore((s) => s.runOutputs);
  const runError = useWorkflowStore((s) => s.runError);
  const nodes = useWorkflowStore((s) => s.nodes);

  // ── Duration tracking ──────────────────────────────────────────────────
  // We measure from the moment isRunning flips to true. When it flips back
  // to false we freeze the elapsed value so the user sees the final number.
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (isRunning) {
      const start = Date.now();
      setStartedAt(start);
      setElapsedMs(0);
      const t = setInterval(() => setElapsedMs(Date.now() - start), 100);
      return () => clearInterval(t);
    }
    // Run just ended — snapshot the final duration.
    if (startedAt) {
      setElapsedMs(Date.now() - startedAt);
    }
    return undefined;
    // We intentionally only want to react to the running flag flipping,
    // not to `startedAt` changes (that would loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const hasAnyRunState =
    Object.keys(runStatus).length > 0 ||
    Object.keys(runOutputs).length > 0 ||
    isRunning ||
    runError !== null;

  const [open, setOpen] = React.useState(true);
  const [dismissed, setDismissed] = React.useState(false);

  // Pop the console open whenever a new run starts.
  React.useEffect(() => {
    if (isRunning) {
      setOpen(true);
      setDismissed(false);
    }
  }, [isRunning]);

  // ── Auto-scroll to latest activity ─────────────────────────────────────
  const bodyRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open || !isRunning) return;
    const node = bodyRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
    // Re-running this effect on every token would be wasteful — but a few
    // times per second is fine and keeps the active row in view.
  }, [runTokens, runStatus, open, isRunning]);

  if (!hasAnyRunState || dismissed) return null;

  const total = nodes.length;
  const done = Object.values(runStatus).filter((s) => s === "success").length;
  const failed = Object.values(runStatus).some((s) => s === "error");

  return (
    <div className="border-t border-border bg-card/40">
      {/* Slim progress bar — bridges header and body, shows progress at a glance */}
      <div className="relative h-px w-full overflow-hidden bg-border">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0",
            failed || runError
              ? "bg-destructive"
              : isRunning
                ? "bg-brand-500"
                : "bg-emerald-500",
          )}
          animate={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            Run console
          </span>
          <RunSummaryBadge
            isRunning={isRunning}
            done={done}
            total={total}
            failed={failed}
            error={runError}
            elapsedMs={elapsedMs}
          />
        </div>
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close run console"
          >
            <X className="h-3 w-3" />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="console-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div
              ref={bodyRef}
              className="max-h-[240px] overflow-y-auto border-t border-border/60 bg-background/40 px-4 py-3"
            >
              {runError && (
                <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                  <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span>{runError}</span>
                </div>
              )}

              <ul className="space-y-2">
                {nodes.map((n) => {
                  const status = runStatus[n.id] ?? "idle";
                  if (status === "idle") return null;
                  return (
                    <ConsoleRow
                      key={n.id}
                      label={String(
                        (n.data as { label?: string }).label ?? n.type,
                      )}
                      kind={(n.type ?? "trigger") as WorkflowNodeKind}
                      status={status}
                      tokens={runTokens[n.id]}
                      output={runOutputs[n.id]}
                    />
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Header summary badge ───────────────────────────────────────────────────

function RunSummaryBadge({
  isRunning,
  done,
  total,
  failed,
  error,
  elapsedMs,
}: {
  isRunning: boolean;
  done: number;
  total: number;
  failed: boolean;
  error: string | null;
  elapsedMs: number | null;
}) {
  const duration =
    elapsedMs == null
      ? null
      : elapsedMs >= 1000
        ? `${(elapsedMs / 1000).toFixed(1)}s`
        : `${elapsedMs}ms`;

  if (error || failed) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-destructive">
        <AlertCircle className="h-3 w-3" />
        failed
        {duration && (
          <span className="text-destructive/60">· {duration}</span>
        )}
      </span>
    );
  }
  if (isRunning) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-brand-700 dark:text-brand-300">
        <Loader2 className="h-3 w-3 animate-spin" />
        {done} / {total}
        {duration && (
          <span className="text-muted-foreground">· {duration}</span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      complete · {done} steps
      {duration && <span className="text-muted-foreground">· {duration}</span>}
    </span>
  );
}

// ─── Per-node row ───────────────────────────────────────────────────────────

const kindIconMap: Record<WorkflowNodeKind, typeof Zap> = {
  trigger: Zap,
  ai_step: Sparkles,
  transform: Wand2,
  output: Send,
};

function ConsoleRow({
  label,
  kind,
  status,
  tokens,
  output,
}: {
  label: string;
  kind: WorkflowNodeKind;
  status: NodeStatus;
  tokens?: string;
  output?: string;
}) {
  const text = tokens ?? output ?? "";
  const Icon = kindIconMap[kind];

  return (
    <li
      className={cn(
        "rounded-md border bg-card px-3 py-2 transition-colors",
        status === "running"
          ? "border-brand-500/40 bg-brand-500/[0.025]"
          : status === "error"
            ? "border-destructive/40 bg-destructive/[0.03]"
            : status === "success"
              ? "border-border"
              : "border-border",
      )}
    >
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 font-mono">
          <div className="grid h-4 w-4 place-items-center rounded border border-border bg-background text-muted-foreground">
            <Icon className="h-2.5 w-2.5" />
          </div>
          <StatusGlyph status={status} />
          <span className="text-foreground">{label}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-muted-foreground">{kind}</span>
        </div>
        {status === "running" && (
          <span className="font-mono text-[10px] text-brand-700 dark:text-brand-300">
            streaming
          </span>
        )}
      </div>
      {text && (
        <pre
          className={cn(
            "mt-1.5 whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-foreground",
            status === "running" ? "type-cursor" : "",
          )}
        >
          {text}
        </pre>
      )}
    </li>
  );
}

function StatusGlyph({ status }: { status: NodeStatus }) {
  if (status === "success")
    return (
      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    );
  if (status === "running")
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
      </span>
    );
  if (status === "error")
    return <span className="inline-flex h-2 w-2 rounded-full bg-destructive" />;
  if (status === "queued")
    return <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />;
  return (
    <span className="inline-flex h-2 w-2 rounded-full border border-border" />
  );
}
