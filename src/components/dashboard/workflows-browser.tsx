"use client";

/**
 * Workflows browser — the workflows-toolbar plus the workflow card grid,
 * wired together so the filter pills, search, sort dropdown, and view
 * toggle actually change what the user sees.
 *
 * Used by /workflows (full list) and previously by /dashboard (preview).
 * The page hands us the raw list as a prop; all narrowing happens
 * client-side. Cheap for the small workflow counts we currently support.
 */

import * as React from "react";
import Link from "next/link";
import { Play, Plus, Workflow as WorkflowIcon } from "lucide-react";
import { WorkflowsToolbar, type WorkflowFilter, type WorkflowSort, type WorkflowView } from "./workflows-toolbar";
import { WorkflowCard } from "./workflow-card";
import { Button } from "@/components/ui/button";
import type { MockWorkflow } from "@/lib/mock-data";

interface WorkflowsBrowserProps {
  workflows: MockWorkflow[];
  /** True when the workflows came from Supabase (not the fixture set). */
  isReal: boolean;
}

const FILTER_TO_STATUS: Record<Exclude<WorkflowFilter, "All">, MockWorkflow["status"][]> = {
  Healthy: ["healthy"],
  Running: ["running"],
  Attention: ["failed"],
  Drafts: ["draft", "paused"],
};

function parseRelative(label: string): number {
  // Smaller number = more recent. "never" sinks to the bottom.
  if (label === "never") return Number.POSITIVE_INFINITY;
  const m = /^(\d+)\s*([smhd])/.exec(label);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  return n * 86400;
}

export function WorkflowsBrowser({ workflows, isReal }: WorkflowsBrowserProps) {
  const [filter, setFilter] = React.useState<WorkflowFilter>("All");
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<WorkflowSort>("Last run");
  const [view, setView] = React.useState<WorkflowView>("grid");

  const visible = React.useMemo(() => {
    let list = workflows;

    if (filter !== "All") {
      const statuses = FILTER_TO_STATUS[filter];
      list = list.filter((w) => statuses.includes(w.status));
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.description.toLowerCase().includes(q) ||
          w.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    const sorted = [...list];
    if (sort === "Name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "Most runs") {
      sorted.sort((a, b) => b.runs - a.runs);
    } else {
      // "Last run" — most recent first. Mock rows that never ran sink.
      sorted.sort(
        (a, b) => parseRelative(a.lastRunAt) - parseRelative(b.lastRunAt),
      );
    }

    return sorted;
  }, [workflows, filter, query, sort]);

  // True empty workspace (no rows at all) — skip the toolbar entirely.
  // Filtering on zero items is cognitive noise; the user needs a clear CTA.
  if (workflows.length === 0) {
    return <WorkflowsEmptyState />;
  }

  return (
    <div className="space-y-5">
      <WorkflowsToolbar
        filter={filter}
        onFilterChange={setFilter}
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        view={view}
        onViewChange={setView}
        totalCount={workflows.length}
        visibleCount={visible.length}
      />

      {visible.length === 0 ? (
        <EmptyResults query={query} />
      ) : (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              : "grid grid-cols-1 gap-3"
          }
        >
          {visible.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} isReal={isReal} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Filter narrowed the list to zero — the workspace still has workflows. */
function EmptyResults({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <p className="text-[13.5px] text-muted-foreground">
        {query.trim()
          ? `No workflows match “${query.trim()}”.`
          : "No workflows match the current filters."}
      </p>
    </div>
  );
}

/**
 * Page-level empty state — the workspace genuinely has no workflows.
 * Mirrors the dashboard onboarding card's visual hierarchy so a user
 * who lands here from the sidebar gets a consistent invitation.
 */
function WorkflowsEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
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

      <div className="relative grid place-items-center px-6 py-16 text-center sm:py-20">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-background text-foreground shadow-elevation-1">
          <WorkflowIcon className="h-5 w-5" />
        </div>

        <h2 className="mt-6 text-balance text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
          Compose your first workflow.
        </h2>
        <p className="mt-2 max-w-md text-pretty text-[14px] leading-relaxed text-muted-foreground">
          Workflows are a visual graph of triggers, AI steps, transforms,
          and outputs. Open the live demo to see one in motion, or start
          from a blank canvas.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
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
      </div>
    </div>
  );
}
