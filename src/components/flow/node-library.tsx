"use client";

/**
 * Node library — the left sidebar of the editor.
 *
 * Drag-and-drop mechanics:
 *  1. Each library item has `draggable` and `onDragStart` that calls
 *     `event.dataTransfer.setData("application/orqestra-node", kind)`.
 *     The MIME type is a custom string — only our editor reads it.
 *  2. The canvas wrapper (in editor.tsx) listens for `onDragOver` and
 *     `onDrop`. On drop, it reads the same key, converts the cursor
 *     position from screen coords to canvas coords (`screenToFlowPosition`),
 *     and calls `store.addNode(kind, position)`.
 *
 * This is a *purely native* HTML5 drag API — no library, no React state
 * involved during the drag. Browsers handle the visual drag preview for us.
 */

import * as React from "react";
import { Search, Zap, Sparkles, Wand2, Send, GripVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { WorkflowNodeKind } from "@/types";
import { NODE_KIND_META } from "@/lib/workflow/defaults";
import { useWorkflowStore } from "@/lib/workflow/store";
import { cn } from "@/lib/utils";

interface LibraryEntry {
  kind: WorkflowNodeKind;
  icon: LucideIcon;
  accent?: boolean;
  category: "Triggers" | "AI" | "Transforms" | "Outputs";
}

const ENTRIES: LibraryEntry[] = [
  { kind: "trigger", icon: Zap, category: "Triggers" },
  { kind: "ai_step", icon: Sparkles, accent: true, category: "AI" },
  { kind: "transform", icon: Wand2, category: "Transforms" },
  { kind: "output", icon: Send, category: "Outputs" },
];

export function NodeLibrary() {
  const [query, setQuery] = React.useState("");
  const setShortcutsOpen = useWorkflowStore((s) => s.setShortcutsOpen);

  const filtered = ENTRIES.filter((e) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      NODE_KIND_META[e.kind].label.toLowerCase().includes(q) ||
      NODE_KIND_META[e.kind].blurb.toLowerCase().includes(q)
    );
  });

  const groups = filtered.reduce<Record<string, LibraryEntry[]>>((acc, e) => {
    (acc[e.category] ||= []).push(e);
    return acc;
  }, {});

  return (
    <aside className="hidden h-full w-[260px] shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Node library
        </h2>
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-[12.5px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {Object.entries(groups).map(([category, entries]) => (
          <div key={category} className="mb-5 last:mb-0">
            <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {category}
            </div>
            <div className="space-y-1.5">
              {entries.map((entry) => (
                <LibraryItem key={entry.kind} entry={entry} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="px-1 text-[12px] text-muted-foreground">
            No nodes match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>

      {/* Footer — tip + button trigger for the shortcuts overlay.
          The button is the discoverable counterpart to the `?` keybinding. */}
      <div className="border-t border-border bg-muted/20 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-accent"
          title="Keyboard shortcuts (?)"
        >
          <span className="text-[11px] leading-relaxed text-muted-foreground">
            <span className="text-foreground">Tip:</span> drag onto the canvas
          </span>
          <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[9.5px] font-medium text-muted-foreground">
            ?
          </kbd>
        </button>
      </div>
    </aside>
  );
}

// ─── Library item ───────────────────────────────────────────────────────────

function LibraryItem({ entry }: { entry: LibraryEntry }) {
  const Icon = entry.icon;
  const meta = NODE_KIND_META[entry.kind];

  // The native drag handler. The MIME-typed dataTransfer key is what the
  // drop target (the canvas) checks for. Setting `effectAllowed = 'copy'`
  // changes the cursor while dragging — small UX detail.
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("application/orqestra-node", entry.kind);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        "group relative flex cursor-grab items-center gap-2.5 rounded-lg border border-border bg-background p-2 transition-all duration-150",
        // Lift micro-interaction — the card rises a hair on hover and lands
        // back down when grabbed, making the drag-to-canvas feel deliberate.
        "hover:-translate-y-px hover:border-foreground/20 hover:shadow-elevation-2 active:translate-y-0 active:cursor-grabbing active:shadow-elevation-1",
      )}
    >
      <div
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-transform group-hover:scale-[1.03]",
          entry.accent
            ? "bg-foreground text-background"
            : "border border-border bg-card text-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium text-foreground">
          {meta.label}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {meta.blurb}
        </div>
      </div>
      {/* Drag-handle affordance — fades in on hover so the row stays clean
          at rest. Decorative; the entire card is the drag source. */}
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
