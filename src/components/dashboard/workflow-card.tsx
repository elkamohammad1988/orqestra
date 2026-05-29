"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Play, Copy, Trash2, Loader2 } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MockWorkflow } from "@/lib/mock-data";
import {
  deleteWorkflowAction,
  duplicateWorkflowAction,
} from "@/app/(editor)/workflows/actions";

interface WorkflowCardProps {
  workflow: MockWorkflow;
  /**
   * Whether this card represents a real, persisted workflow. Mock fixtures
   * (shown when the workspace is empty) get a read-only menu — Delete /
   * Duplicate would no-op against the database and confuse the user.
   */
  isReal?: boolean;
}

export function WorkflowCard({ workflow, isReal = false }: WorkflowCardProps) {
  return (
    <Link
      href={`/workflows/${workflow.id}`}
      className="lift group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card p-5 shadow-elevation-1 transition-colors hover:border-foreground/20 hover:shadow-elevation-2"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <StatusBadge status={workflow.status} />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {workflow.name}
            </h3>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground line-clamp-2">
              {workflow.description}
            </p>
          </div>
        </div>
        <CardMenu workflowId={workflow.id} isReal={isReal} />
      </div>

      {/* Metrics row */}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          <Metric label="Steps" value={workflow.steps.toString()} />
          <Metric
            label="Runs"
            value={
              workflow.runs >= 1000
                ? `${(workflow.runs / 1000).toFixed(1)}k`
                : workflow.runs.toString()
            }
          />
          <Metric
            label="Success"
            value={workflow.runs > 0 ? `${workflow.successRate}%` : "—"}
          />
        </div>
        {workflow.runs > 0 && (
          <div className="h-7 w-20 shrink-0 text-foreground/40 group-hover:text-foreground transition-colors">
            <Sparkline
              data={workflow.runsSparkline}
              width={80}
              height={28}
              color="currentColor"
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
        <div className="flex items-center gap-2">
          <Avatar
            name={workflow.updatedBy.initials}
            size="xs"
            className="text-[8px]"
          />
          <div className="text-[11.5px] text-muted-foreground">
            <span className="text-foreground">{workflow.updatedBy.name}</span>
            <span className="mx-1">·</span>
            {workflow.lastRunAt}
          </div>
        </div>
        <div className="flex gap-1">
          {workflow.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function CardMenu({
  workflowId,
  isReal,
}: {
  workflowId: string;
  isReal: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<null | "duplicate" | "delete">(
    null,
  );

  // Stop the click from bubbling to the card-wrapping <Link>. Without this,
  // selecting a menu item also navigates to the workflow page.
  function swallow(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDuplicate(e: Event) {
    e.preventDefault();
    if (!isReal || pending) return;
    setPending("duplicate");
    const res = await duplicateWorkflowAction(workflowId);
    setPending(null);
    if (res.ok && res.workflow) {
      router.refresh();
    }
  }

  async function handleDelete(e: Event) {
    e.preventDefault();
    if (!isReal || pending) return;
    if (
      !window.confirm(
        "Delete this workflow? This cannot be undone.",
      )
    ) {
      return;
    }
    setPending("delete");
    const res = await deleteWorkflowAction(workflowId);
    setPending(null);
    if (res.ok) router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={swallow}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          aria-label="Workflow actions"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onClick={swallow}
      >
        <DropdownMenuItem asChild>
          <Link href={`/workflows/${workflowId}`}>
            <Play /> Open
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleDuplicate}
          disabled={!isReal || pending !== null}
        >
          <Copy /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleDelete}
          disabled={!isReal || pending !== null}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="text-destructive" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[14px] font-semibold tracking-tight text-foreground nums">
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: MockWorkflow["status"] }) {
  const config = {
    healthy: { color: "bg-emerald-500", ring: "ring-emerald-500/20", label: "Healthy", pulse: false },
    running: { color: "bg-brand-500", ring: "ring-brand-500/20", label: "Running", pulse: true },
    failed: { color: "bg-amber-500", ring: "ring-amber-500/20", label: "Attention", pulse: false },
    draft: { color: "bg-muted-foreground", ring: "ring-muted-foreground/10", label: "Draft", pulse: false },
    paused: { color: "bg-muted-foreground", ring: "ring-muted-foreground/10", label: "Paused", pulse: false },
  }[status];

  return (
    <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center">
      <span className={cn("relative flex h-2 w-2", `ring-4 ${config.ring} rounded-full`)}>
        {config.pulse && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", config.color)} />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.color)} />
      </span>
    </div>
  );
}
