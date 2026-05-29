/**
 * Recent runs panel — server component.
 *
 * Reads the current user's last N runs from Supabase (RLS-scoped). When
 * the workspace has no real runs yet, falls back to the mock fixtures so
 * the demo dashboard still looks like a real product. The fallback runs
 * link nowhere (their ids are fictional); real runs link into the
 * detail page at /runs/[id].
 */

import Link from "next/link";
import {
  Webhook,
  MousePointer2,
  Clock,
  Code2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockRecentRuns, type MockRun } from "@/lib/mock-data";
import { listRecentRuns } from "@/lib/workflow/runs";
import { listWorkflows } from "@/lib/workflow/persistence";
import { isSupabaseConfigured } from "@/lib/env";
import type { WorkflowRun, RunStatus, RunTrigger } from "@/types";

interface DisplayRun {
  id: string;
  workflowName: string;
  workflowId: string;
  status: MockRun["status"];
  startedAt: string;
  duration: string;
  tokens: number;
  trigger: MockRun["trigger"];
  /** True when this row links to a real persisted run detail page. */
  isReal: boolean;
}

interface RecentRunsProps {
  /**
   * Cap rows shown. The dashboard's sidebar wants a short list (5);
   * the /runs page wants a longer feed (default 25).
   */
  limit?: number;
  /** Hides the header (used when the parent already shows a page title). */
  hideHeader?: boolean;
  /**
   * Custom empty state. The dashboard sidebar wants a compact placeholder;
   * the /runs page wants a full-bleed empty card with a CTA. Default is
   * the compact placeholder.
   */
  emptyState?: React.ReactNode;
}

const STATUS_MAP: Record<RunStatus, MockRun["status"]> = {
  running: "running",
  success: "success",
  failed: "failed",
  canceled: "failed",
};

function realToDisplay(
  run: WorkflowRun,
  workflowNameById: Map<string, string>,
): DisplayRun {
  return {
    id: run.id,
    workflowName:
      workflowNameById.get(run.workflow_id) ?? "Unknown workflow",
    workflowId: run.workflow_id,
    status: STATUS_MAP[run.status],
    startedAt: relativeTime(run.started_at),
    duration: formatDuration(run.duration_ms),
    tokens: run.token_count,
    trigger: run.trigger as RunTrigger as MockRun["trigger"],
    isReal: true,
  };
}

function mockToDisplay(run: MockRun): DisplayRun {
  // Mock runs with a corresponding mock detail render as Links so the demo
  // surface is navigable end-to-end without needing Supabase / real data.
  return { ...run, isReal: run.hasDetail === true };
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export async function RecentRuns({
  limit = 5,
  hideHeader = false,
  emptyState,
}: RecentRunsProps = {}) {
  const real = isSupabaseConfigured() ? await listRecentRuns(limit) : [];

  let runs: DisplayRun[];
  if (real.length > 0) {
    const workflows = await listWorkflows();
    const workflowNameById = new Map(workflows.map((w) => [w.id, w.name]));
    runs = real.map((r) => realToDisplay(r, workflowNameById));
  } else if (isSupabaseConfigured()) {
    // Real workspace with no runs yet — surface the empty state instead
    // of leaking the demo fixtures into a freshly signed-in account.
    runs = [];
  } else {
    runs = mockRecentRuns.slice(0, limit).map(mockToDisplay);
  }

  // When the caller passes a polished page-level empty state, render it
  // *outside* the bordered shell so the visual weight is right.
  if (runs.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elevation-1">
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
              Recent runs
            </h3>
            <p className="text-[11.5px] text-muted-foreground">
              Latest executions across all workflows
            </p>
          </div>
          <Link
            href="/runs"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="divide-y divide-border/70">
        {runs.length === 0 ? (
          <EmptyRow />
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}

/**
 * Compact placeholder used by the dashboard sidebar — fits inside the
 * existing "Recent runs" card without competing with the card chrome.
 * The /runs page passes its own full-bleed empty state via `emptyState`.
 */
function EmptyRow() {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-[13px] text-muted-foreground">
        No runs yet. Open a workflow and hit Run to see executions here.
      </p>
    </div>
  );
}

function RunRow({ run }: { run: DisplayRun }) {
  const inner = (
    <>
      <RunStatus status={run.status} />

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {run.workflowName}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground">
          <span>{run.id.slice(0, 8)}</span>
          <span>·</span>
          <TriggerBadge trigger={run.trigger} />
        </div>
      </div>

      <div className="hidden items-center gap-1.5 font-mono text-[11px] text-muted-foreground sm:flex">
        <Clock className="h-3 w-3" />
        {run.startedAt}
      </div>

      <div className="hidden text-right font-mono text-[11px] sm:block">
        <div className="text-foreground">{run.duration}</div>
        <div className="text-[10px] text-muted-foreground">
          {run.tokens.toLocaleString()} tok
        </div>
      </div>

      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </>
  );

  const className =
    "group grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:gap-5";

  if (run.isReal) {
    return (
      <Link href={`/runs/${run.id}`} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function RunStatus({ status }: { status: MockRun["status"] }) {
  const config = {
    success: { dot: "bg-emerald-500", label: "✓" },
    running: { dot: "bg-brand-500", label: "↻" },
    failed: { dot: "bg-amber-500", label: "!" },
    queued: { dot: "bg-muted-foreground/40", label: "·" },
  }[status];

  if (status === "running") {
    return (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-70", config.dot)} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
      </span>
    );
  }
  return <span className={cn("inline-flex h-2 w-2 shrink-0 rounded-full", config.dot)} />;
}

function TriggerBadge({ trigger }: { trigger: MockRun["trigger"] }) {
  const config = {
    manual: { icon: MousePointer2, label: "manual" },
    schedule: { icon: Clock, label: "schedule" },
    webhook: { icon: Webhook, label: "webhook" },
    api: { icon: Code2, label: "api" },
  }[trigger];
  const Icon = config.icon;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}
