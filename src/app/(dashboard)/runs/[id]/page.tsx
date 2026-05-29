import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getRun } from "@/lib/workflow/runs";
import { isSupabaseConfigured } from "@/lib/env";
import { mockRunDetails } from "@/lib/mock-data";
import type { RunStatus, WorkflowRun } from "@/types";
import type { RunEvent } from "@/lib/workflow/run";
import { cn } from "@/lib/utils";

interface PageProps {
  params: { id: string };
}

export const metadata: Metadata = {
  title: "Run details",
};

export const dynamic = "force-dynamic";

export default async function RunDetailPage({ params }: PageProps) {
  // Unconfigured (portfolio / local dev) mode: surface the matching mock
  // run-detail if the id is a known fixture. Same pattern the dashboard
  // and runs list already use to keep the demo navigable end-to-end.
  let run: (WorkflowRun & { workflow_name: string }) | null = null;
  if (!isSupabaseConfigured()) {
    const mock = mockRunDetails[params.id];
    if (!mock) notFound();
    run = mock as WorkflowRun & { workflow_name: string };
  } else {
    run = await getRun(params.id);
    if (!run) notFound();
  }

  const events = (run.events as RunEvent[]) ?? [];
  const grouped = groupEventsByNode(events);

  return (
    <div className="container max-w-5xl py-8 sm:py-10">
      <Link
        href="/runs"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to runs
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <StatusIcon status={run.status} />
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              {run.workflow_name}
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-muted-foreground">
            <span>{run.id}</span>
            <span>·</span>
            <span>{new Date(run.started_at).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/workflows/${run.workflow_id}`}
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Open workflow →
          </Link>
        </div>
      </div>

      {/* Stat row */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={Clock}
          label="Duration"
          value={formatDuration(run.duration_ms)}
        />
        <Stat
          icon={Cpu}
          label="Tokens"
          value={run.token_count.toLocaleString()}
          unit="≈"
        />
        <Stat
          icon={statusIconFor(run.status)}
          label="Status"
          value={statusLabel(run.status)}
          accent={statusAccent(run.status)}
        />
        <Stat
          label="Trigger"
          value={run.trigger}
          mono
        />
      </div>

      {/* Error banner */}
      {run.error_message && (
        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Run failed</div>
            <div className="mt-0.5 font-mono text-[12px]">{run.error_message}</div>
          </div>
        </div>
      )}

      {/* Trigger input */}
      {run.trigger_input && (
        <section className="mt-8">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Trigger input
          </h2>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-card px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground">
            {run.trigger_input}
          </pre>
        </section>
      )}

      {/* Event timeline */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Timeline
          </h2>
          <span className="text-[11.5px] text-muted-foreground">
            {events.length} events
          </span>
        </div>

        {grouped.length === 0 ? (
          <div className="mt-3 rounded-lg border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
            No events were recorded for this run.
          </div>
        ) : (
          <ol className="mt-4 space-y-3">
            {grouped.map((group) => (
              <NodeGroup key={group.nodeId} group={group} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ─── Event grouping ─────────────────────────────────────────────────────────

interface NodeEventGroup {
  nodeId: string;
  status: "idle" | "queued" | "running" | "success" | "error" | "unknown";
  output: string | null;
  tokenChunks: string[];
  errorMessage: string | null;
}

/**
 * Walk the event stream once and reduce it into one entry per node, plus
 * any run-level errors as a synthetic group. The UI then renders these
 * groups vertically — much cleaner than a flat 200-row event list.
 */
function groupEventsByNode(events: RunEvent[]): NodeEventGroup[] {
  const map = new Map<string, NodeEventGroup>();
  const order: string[] = [];
  const ensure = (nodeId: string): NodeEventGroup => {
    let g = map.get(nodeId);
    if (!g) {
      g = {
        nodeId,
        status: "unknown",
        output: null,
        tokenChunks: [],
        errorMessage: null,
      };
      map.set(nodeId, g);
      order.push(nodeId);
    }
    return g;
  };

  for (const ev of events) {
    if (ev.type === "run_start") {
      for (const id of ev.nodeIds) ensure(id);
      continue;
    }
    if (ev.type === "run_complete") continue;
    if (ev.type === "run_error") {
      if (ev.nodeId) {
        const g = ensure(ev.nodeId);
        g.errorMessage = ev.error;
        g.status = "error";
      }
      continue;
    }
    const g = ensure(ev.nodeId);
    if (ev.type === "node_status") g.status = ev.status;
    else if (ev.type === "node_token") g.tokenChunks.push(ev.token);
    else if (ev.type === "node_output") g.output = ev.output;
  }

  return order.map((id) => map.get(id)!);
}

function NodeGroup({ group }: { group: NodeEventGroup }) {
  const streamed = group.tokenChunks.join("");
  const hasOutput = group.output !== null && group.output.length > 0;

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <NodeStatusBadge status={group.status} />
          <span className="font-mono text-[12px] text-foreground">
            {group.nodeId}
          </span>
        </div>
        {group.tokenChunks.length > 0 && (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {group.tokenChunks.length} tokens
          </span>
        )}
      </header>

      {(hasOutput || streamed) && (
        <pre className="max-h-64 overflow-auto px-4 py-3 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
          {group.output ?? streamed}
        </pre>
      )}

      {group.errorMessage && (
        <div className="border-t border-destructive/20 bg-destructive/5 px-4 py-2.5 font-mono text-[12px] text-destructive">
          {group.errorMessage}
        </div>
      )}
    </li>
  );
}

// ─── Pure presentation helpers ──────────────────────────────────────────────

function Stat({
  icon: Icon,
  label,
  value,
  unit,
  mono,
  accent,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  mono?: boolean;
  accent?: "good" | "bad" | "neutral";
}) {
  const color =
    accent === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "bad"
        ? "text-amber-600 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-3.5 shadow-elevation-1">
      <div className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <div
          className={cn(
            "text-[20px] font-semibold leading-none tracking-tight nums",
            mono && "font-mono text-[15px]",
            color,
          )}
        >
          {value}
        </div>
        {unit && (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: RunStatus }) {
  const Icon = statusIconFor(status);
  return (
    <Icon
      className={cn(
        "h-5 w-5 shrink-0",
        status === "success" && "text-emerald-500",
        status === "failed" && "text-amber-500",
        status === "running" && "animate-spin text-brand-500",
        status === "canceled" && "text-muted-foreground",
      )}
    />
  );
}

function NodeStatusBadge({
  status,
}: {
  status: NodeEventGroup["status"];
}) {
  const config: Record<
    NodeEventGroup["status"],
    { label: string; tone: string }
  > = {
    idle: { label: "idle", tone: "bg-muted text-muted-foreground" },
    queued: { label: "queued", tone: "bg-muted text-muted-foreground" },
    running: {
      label: "running",
      tone: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    },
    success: {
      label: "success",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    error: {
      label: "error",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    unknown: { label: "—", tone: "bg-muted text-muted-foreground" },
  };
  const c = config[status];
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-mono text-[10px]", c.tone)}
    >
      {c.label}
    </Badge>
  );
}

function statusIconFor(status: RunStatus) {
  switch (status) {
    case "success":
      return CheckCircle2;
    case "failed":
      return AlertCircle;
    case "running":
      return Loader2;
    case "canceled":
      return XCircle;
  }
}

function statusLabel(status: RunStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusAccent(status: RunStatus): "good" | "bad" | "neutral" {
  if (status === "success") return "good";
  if (status === "failed" || status === "canceled") return "bad";
  return "neutral";
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
