"use client";

/**
 * BaseNode — shared chrome for every custom node.
 *
 * This version trades the previous `!important` Tailwind handles for global
 * CSS rules in globals.css (.react-flow__handle), which feels less hacky
 * and lets us share the focus/hover treatment across every node kind.
 *
 * STATE TREATMENTS (all decorative — execution logic is untouched):
 *   idle      → standard border, neutral hover (lift on hover)
 *   queued    → amber-tinted border, subtle bg tint
 *   running   → brand border with breathing glow (CSS keyframes)
 *   success   → emerald border, one-shot flash on transition
 *   error     → destructive border + warning icon
 *
 * Selection ring is independent of status and always overrides.
 */

import * as React from "react";
import { Handle, Position } from "reactflow";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/workflow/types";

interface BaseNodeProps {
  icon: LucideIcon;
  label: string;
  /** A short config preview shown under the header. */
  preview?: React.ReactNode;
  /** Filled icon background — reserved for the AI kind. */
  accent?: boolean;
  hasOutput?: boolean;
  hasInput?: boolean;
  selected?: boolean;
  status?: NodeStatus;
  /** Optional small label shown after the title — e.g. node kind. */
  kindLabel?: string;
}

export function BaseNode({
  icon: Icon,
  label,
  preview,
  accent = false,
  hasInput = true,
  hasOutput = true,
  selected = false,
  status = "idle",
  kindLabel,
}: BaseNodeProps) {
  // Track the transition into "success" to play a one-shot flash. We watch
  // status changes via a ref instead of a useEffect to avoid an unmount/
  // remount when React Flow re-renders the node on drag.
  const prevStatus = React.useRef<NodeStatus>(status);
  const [flashKey, setFlashKey] = React.useState(0);
  if (prevStatus.current !== status) {
    if (status === "success" && prevStatus.current !== "success") {
      setFlashKey((k) => k + 1);
    }
    prevStatus.current = status;
  }

  return (
    <div
      className={cn(
        "relative w-[230px] rounded-xl border bg-card text-card-foreground transition-all duration-150",
        // Default elevation. Selection wins over everything.
        selected
          ? "border-foreground/35 ring-2 ring-foreground/15 ring-offset-2 ring-offset-background shadow-elevation-3"
          : "border-border shadow-elevation-2 hover:border-foreground/20 hover:shadow-elevation-3 hover:-translate-y-px",
        // Status overlays (only apply when not selected to avoid colliding
        // with the explicit selection ring).
        !selected && statusClasses(status),
      )}
    >
      {/* Success flash — one-shot ::before pseudo-element on a keyed wrapper */}
      {flashKey > 0 && (
        <span
          key={flashKey}
          aria-hidden
          className="node-success-flash pointer-events-none absolute inset-0 rounded-xl"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors duration-150",
            accent
              ? "bg-foreground text-background"
              : "border border-border bg-background text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium leading-tight text-foreground">
              {label}
            </span>
            {kindLabel && (
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground/60">
                {kindLabel}
              </span>
            )}
          </div>
        </div>
        <StatusIndicator status={status} />
      </div>

      {/* Body */}
      {preview && (
        <div className="border-t border-border/70 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          {preview}
        </div>
      )}

      {/* Handles — styling lives in globals.css (.react-flow__handle). */}
      {hasInput && (
        <Handle type="target" position={Position.Left} aria-label="Input" />
      )}
      {hasOutput && (
        <Handle type="source" position={Position.Right} aria-label="Output" />
      )}
    </div>
  );
}

// ─── Status → className map ─────────────────────────────────────────────────

function statusClasses(status: NodeStatus): string {
  switch (status) {
    case "queued":
      return "border-amber-500/40 bg-amber-500/[0.02]";
    case "running":
      // node-running-glow is a CSS keyframe loop in globals.css.
      return "border-brand-500/60 node-running-glow bg-brand-500/[0.025]";
    case "success":
      return "border-emerald-500/40";
    case "error":
      return "border-destructive/50 bg-destructive/[0.03]";
    default:
      return "";
  }
}

// ─── Status indicator (top-right corner) ────────────────────────────────────

function StatusIndicator({ status }: { status: NodeStatus }) {
  if (status === "success") {
    return (
      <div className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15">
        <svg
          viewBox="0 0 12 12"
          className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400"
        >
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
  if (status === "error") {
    return (
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
    );
  }
  if (status === "queued") {
    return (
      <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />
    );
  }
  // idle — small hollow dot, deliberately subdued so it doesn't compete
  // visually with the named statuses.
  return (
    <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
  );
}
