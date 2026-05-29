"use client";

import { Search, LayoutGrid, List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const WORKFLOW_FILTERS = [
  "All",
  "Healthy",
  "Running",
  "Attention",
  "Drafts",
] as const;
export type WorkflowFilter = (typeof WORKFLOW_FILTERS)[number];

export const WORKFLOW_SORTS = ["Last run", "Most runs", "Name"] as const;
export type WorkflowSort = (typeof WORKFLOW_SORTS)[number];

export type WorkflowView = "grid" | "list";

interface WorkflowsToolbarProps {
  filter: WorkflowFilter;
  onFilterChange: (next: WorkflowFilter) => void;
  query: string;
  onQueryChange: (next: string) => void;
  sort: WorkflowSort;
  onSortChange: (next: WorkflowSort) => void;
  view: WorkflowView;
  onViewChange: (next: WorkflowView) => void;
  /** Used to surface "showing N of M" hint when filters narrow the list. */
  totalCount: number;
  visibleCount: number;
}

/**
 * Controlled toolbar for the workflows list. All state lives in the parent
 * (WorkflowsBrowser) so the actual filtering happens against the data.
 */
export function WorkflowsToolbar({
  filter,
  onFilterChange,
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  totalCount,
  visibleCount,
}: WorkflowsToolbarProps) {
  const narrowed = visibleCount !== totalCount;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Filter pills */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1 shadow-elevation-1 sm:overflow-visible">
        {WORKFLOW_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              filter === f
                ? "bg-foreground text-background shadow-elevation-1"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 sm:w-64 sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search workflows…"
            aria-label="Search workflows"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[13px] shadow-elevation-1 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] font-medium text-foreground shadow-elevation-1 hover:bg-accent"
            >
              <span className="text-muted-foreground">Sort:</span> {sort}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {WORKFLOW_SORTS.map((option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() => onSortChange(option)}
              >
                {option}
                {sort === option && (
                  <span className="ml-auto text-xs text-muted-foreground">·</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-elevation-1">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={cn(
              "grid h-7 w-7 place-items-center rounded transition-colors",
              view === "grid"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={cn(
              "grid h-7 w-7 place-items-center rounded transition-colors",
              view === "list"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>

        {narrowed && (
          <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
            {visibleCount}/{totalCount}
          </span>
        )}
      </div>
    </div>
  );
}
