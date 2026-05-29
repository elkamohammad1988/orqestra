"use client";

/**
 * Status bar — the bottom strip of the editor.
 *
 * Compact graph summary at the left, system status + shortcuts trigger at
 * the right. Intentionally low-contrast — this strip is a quick glance, not
 * a focal point. The shortcuts button mirrors the topbar's button so the
 * keyboard help is discoverable from either edge of the chrome.
 *
 * Validation reporting (orphan nodes, type mismatches) is the next thing
 * to land here — the grouping leaves a slot ready for it.
 */

import { useWorkflowStore } from "@/lib/workflow/store";
import { Keyboard } from "lucide-react";

export function StatusBar() {
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const edgeCount = useWorkflowStore((s) => s.edges.length);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const runError = useWorkflowStore((s) => s.runError);
  const setShortcutsOpen = useWorkflowStore((s) => s.setShortcutsOpen);

  return (
    <div className="flex h-7 shrink-0 items-center justify-between gap-4 border-t border-border bg-card/40 px-3 font-mono text-[10.5px] text-muted-foreground sm:px-4">
      {/* Left — graph stats, grouped into a single pill-style cluster.
          Visually one unit so the eye doesn't ping-pong between counters. */}
      <div className="flex items-center gap-1">
        <StatGroup>
          <Stat label="nodes" value={nodeCount} />
          <Divider />
          <Stat label="edges" value={edgeCount} />
        </StatGroup>
        {selectedNodeId && (
          <>
            <span className="mx-1 text-muted-foreground/40">·</span>
            <span
              className="truncate text-foreground"
              title={selectedNodeId}
            >
              {selectedNodeId.slice(0, 18)}
              {selectedNodeId.length > 18 ? "…" : ""}
            </span>
          </>
        )}
      </div>

      {/* Right — system pill + shortcuts trigger. The runtime status reads
          from `isRunning` / `runError` so it stays truthful even when the
          run console is dismissed. */}
      <div className="flex items-center gap-2">
        <SystemPill running={isRunning} error={runError !== null} />
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="hidden items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
          aria-label="Open keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-3 w-3" />
          <kbd className="font-mono text-[10px]">?</kbd>
        </button>
      </div>
    </div>
  );
}

// ─── Building blocks ────────────────────────────────────────────────────────

function StatGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-background/40 px-2 py-0.5">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-foreground tabular-nums">{value}</span>
      <span className="text-muted-foreground/80">{label}</span>
    </span>
  );
}

function Divider() {
  return <span className="text-muted-foreground/30">·</span>;
}

function SystemPill({
  running,
  error,
}: {
  running: boolean;
  error: boolean;
}) {
  if (error) {
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
        run failed
      </span>
    );
  }
  if (running) {
    return (
      <span className="inline-flex items-center gap-1.5 text-brand-700 dark:text-brand-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
        </span>
        running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      ready
    </span>
  );
}
