"use client";

/**
 * Editor topbar — Save + Run wired to real persistence and the orchestrator.
 *
 * Save flow:
 *   click → saveStatus = "saving" → server action upserts to Supabase →
 *   on success: markSaved() flips status to "saved" and stores `workflowId`
 *   on failure: setSaveStatus("error")
 *
 * Run flow:
 *   click → store.startRun() → POST /api/workflows/run → SSE consumer
 *   walks the stream and dispatches events into the store → nodes light up
 *   live → run_complete or run_error → store.finishRun()
 *
 * The buttons read `isRunning` and `saveStatus` from the store and self-
 * disable. Nothing else needs to know a run is happening.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Save,
  Share2,
  GitBranch,
  CircleDot,
  Loader2,
  Check,
  Square,
  Keyboard,
  Link2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkflowStore, type SaveStatus } from "@/lib/workflow/store";
import { saveWorkflowAction } from "@/app/(editor)/workflows/actions";
import { runWorkflowOnClient } from "@/lib/workflow/run-client";
import { nodeToDomain, edgeToDomain } from "@/lib/workflow/serialize";
import { DEMO_TRIGGER_INPUT } from "@/lib/workflow/mock-workflow";
import { cn } from "@/lib/utils";

interface EditorTopbarProps {
  /** True when this is the public demo workflow — save is hidden, no auth needed. */
  readOnly?: boolean;
}

export function EditorTopbar({ readOnly = false }: EditorTopbarProps) {
  const router = useRouter();

  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const saveStatus = useWorkflowStore((s) => s.saveStatus);
  const isRunning = useWorkflowStore((s) => s.isRunning);
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const setShortcutsOpen = useWorkflowStore((s) => s.setShortcutsOpen);

  // ─── Save ────────────────────────────────────────────────────────────────

  const handleSave = React.useCallback(async () => {
    if (readOnly) return;
    const store = useWorkflowStore.getState();
    store.setSaveStatus("saving");

    const result = await saveWorkflowAction({
      id: store.workflowId ?? undefined,
      name: store.name,
      description: store.description,
      nodes: store.nodes.map(nodeToDomain),
      edges: store.edges.map(edgeToDomain),
    });

    if (result.ok && result.workflow) {
      const created = !store.workflowId;
      store.markSaved(result.workflow.id, result.workflow.webhook_token);
      // If this was a brand-new workflow, swap the URL from /workflows/new
      // to /workflows/<real-id> so the user can share/bookmark it.
      if (created) {
        router.replace(`/workflows/${result.workflow.id}`);
      }
    } else {
      store.setSaveStatus("error");
      console.error("[editor] save failed:", result.error);
    }
  }, [readOnly, router]);

  // Cmd/Ctrl+S → Save
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isSave = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isSave) {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  // ─── Run ─────────────────────────────────────────────────────────────────

  const handleRun = React.useCallback(async () => {
    if (isRunning) return;
    const store = useWorkflowStore.getState();
    if (store.nodes.length === 0) return;

    // Build a snapshot of the current canvas in domain shape — the runner
    // doesn't know about React Flow's render fields.
    const workflow = {
      id: store.workflowId ?? "ephemeral",
      user_id: "client",
      name: store.name,
      description: store.description,
      nodes: store.nodes.map(nodeToDomain),
      edges: store.edges.map(edgeToDomain),
      // Ephemeral client-side run payload. The webhook token is server-
      // assigned and isn't needed for an in-editor run.
      webhook_token: store.webhookToken ?? "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await runWorkflowOnClient(workflow, {
      // Shared with the demo fixture so the Loom story (open demo → hit Run
      // → see realistic output) stays consistent across surfaces.
      triggerInput: DEMO_TRIGGER_INPUT,
    });
  }, [isRunning]);

  // Cmd/Ctrl+Enter → Run
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isRun = (e.metaKey || e.ctrlKey) && e.key === "Enter";
      if (isRun) {
        e.preventDefault();
        handleRun();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href="/workflows"
          className="group grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Back to workflows"
          title="Back to workflows"
        >
          <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-0.5" />
        </Link>

        {/* Breadcrumb — visible from sm up. The slash sits BEFORE the editable
            name to read as a real file path. */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <GitBranch className="h-3 w-3 text-muted-foreground/70" />
          <Link
            href="/workflows"
            className="font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            workflows
          </Link>
          <span className="font-mono text-[11px] text-muted-foreground/50">
            /
          </span>
        </div>

        <WorkflowNameInput value={name} onChange={setName} readOnly={readOnly} />

        {!readOnly && <SaveIndicator status={saveStatus} />}
        {readOnly && <DemoBadge />}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Shortcuts button — opens the keyboard help overlay. */}
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="hidden h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:grid"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-[15px] w-[15px]" />
        </button>

        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            title="Save (Cmd/Ctrl + S)"
          >
            <Save className="h-3.5 w-3.5" />
            Save
            <kbd className="ml-1 hidden font-mono text-[10px] opacity-50 lg:inline">
              ⌘S
            </kbd>
          </Button>
        )}
        {readOnly && (
          <Link href="/workflows/new?template=demo" className="hidden sm:inline-flex">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              title="Fork this demo into your workspace"
            >
              <Copy className="h-3.5 w-3.5" />
              Use as template
            </Button>
          </Link>
        )}
        <ShareButton workflowId={workflowId} isDemo={readOnly} />
        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <Button
          size="sm"
          onClick={handleRun}
          disabled={isRunning || nodeCount === 0}
          className="rounded-md"
          title={
            nodeCount === 0
              ? "Add a node to run"
              : "Run (Cmd/Ctrl + Enter)"
          }
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Running
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              Run
              <kbd className="ml-0.5 hidden font-mono text-[10px] opacity-60 lg:inline">
                ⌘↵
              </kbd>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}

// ─── Share button ───────────────────────────────────────────────────────────
//
// Copies the workflow URL to the clipboard. There's no team/workspace
// sharing yet, so "share" means "give someone the link to this page" —
// which is honest. Hidden for the unsaved /workflows/new state (nothing
// to link to until the first save). For the read-only public demo we
// share the /workflows/demo URL.

function ShareButton({
  workflowId,
  isDemo,
}: {
  workflowId: string | null;
  isDemo: boolean;
}) {
  const [copied, setCopied] = React.useState(false);

  // Nothing meaningful to copy yet — hide rather than offer a dead button.
  if (!isDemo && !workflowId) return null;

  async function handleCopy() {
    if (typeof window === "undefined") return;
    const path = isDemo ? "/workflows/demo" : `/workflows/${workflowId}`;
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can fail in insecure contexts. Fall back to prompt
      // so the user can still grab the URL by hand.
      window.prompt("Copy this URL:", url);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
      title="Copy link to this workflow"
      aria-live="polite"
    >
      {copied ? (
        <>
          <Link2 className="h-3.5 w-3.5 text-emerald-500" />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </Button>
  );
}

// ─── Demo badge ─────────────────────────────────────────────────────────────

function DemoBadge() {
  return (
    <span className="ml-1 hidden items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 py-0.5 pl-1.5 pr-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 sm:inline-flex">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
      </span>
      Demo
    </span>
  );
}

// ─── Workflow name (inline editable) ────────────────────────────────────────

function WorkflowNameInput({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (readOnly) {
    return (
      <span className="min-w-0 truncate px-2 py-1 text-[14px] font-medium text-foreground">
        {value}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") setEditing(false);
        }}
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-[14px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="min-w-0 truncate rounded-md px-2 py-1 text-left text-[14px] font-medium text-foreground transition-colors hover:bg-accent"
      title="Click to rename"
    >
      {value}
    </button>
  );
}

// ─── Save indicator ─────────────────────────────────────────────────────────
//
// The wrapper is fixed-width and AnimatePresence cross-fades the inner
// pill between statuses. Without this, the indicator would "jump" as the
// label text changed length (Saved → Saving… → Saved is 5 → 8 → 5 chars).

const STATUS_MAP: Record<
  SaveStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  saved: {
    label: "Saved",
    icon: <Check className="h-3 w-3" />,
    className: "text-muted-foreground",
  },
  dirty: {
    label: "Unsaved",
    icon: <CircleDot className="h-3 w-3" />,
    className: "text-amber-600 dark:text-amber-400",
  },
  saving: {
    label: "Saving…",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    className: "text-muted-foreground",
  },
  error: {
    label: "Save failed",
    icon: <Square className="h-3 w-3 fill-current" />,
    className: "text-destructive",
  },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const config = STATUS_MAP[status];
  return (
    <div className="ml-1 hidden h-5 w-[78px] items-center sm:flex">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[10.5px]",
            config.className,
          )}
        >
          {config.icon}
          <span>{config.label}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
