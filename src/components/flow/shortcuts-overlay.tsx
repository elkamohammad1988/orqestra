"use client";

/**
 * Keyboard shortcuts overlay.
 *
 * Self-contained: mounts a global keydown listener for two bindings:
 *   - `?` (Shift+/)  → open
 *   - `Esc`          → close
 *
 * Two small but important details:
 *
 *  1. INPUT-AWARE OPEN
 *     We refuse to swallow `?` when the user is typing in an <input>,
 *     <textarea>, or contentEditable region. Otherwise renaming a workflow
 *     to "What is this?" would pop the dialog mid-keystroke.
 *
 *  2. PLATFORM-CORRECT MODIFIER GLYPHS
 *     macOS uses ⌘, Windows/Linux use Ctrl. We sniff once at mount with
 *     `navigator.platform` (still the reliable signal for this purpose)
 *     and pick the right glyph. No re-detection — the user's keyboard
 *     doesn't change between paints.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Command } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";

interface Shortcut {
  /** Key sequence as an array of tokens to render in <kbd> elements. */
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: Shortcut[];
}

function buildGroups(modKey: string): ShortcutGroup[] {
  return [
    {
      title: "Editing",
      items: [
        { keys: ["⌫"], description: "Delete selected node or edge" },
        { keys: [modKey, "S"], description: "Save workflow" },
        { keys: [modKey, "↵"], description: "Run workflow" },
        { keys: ["Esc"], description: "Deselect / close this dialog" },
        { keys: ["?"], description: "Show this help" },
      ],
    },
    {
      title: "Canvas",
      items: [
        { keys: ["Scroll"], description: "Pan the canvas" },
        { keys: [modKey, "Scroll"], description: "Zoom in / out" },
        { keys: ["Drag pane"], description: "Box-select multiple nodes" },
        { keys: ["Double-click"], description: "Fit view to graph" },
      ],
    },
    {
      title: "Nodes",
      items: [
        {
          keys: ["Drag from library"],
          description: "Add a new node at the cursor",
        },
        {
          keys: ["Drag handle"],
          description: "Connect one node's output to another's input",
        },
        { keys: ["Click"], description: "Select a node and open inspector" },
      ],
    },
  ];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function ShortcutsOverlay() {
  const open = useWorkflowStore((s) => s.shortcutsOpen);
  const setOpen = useWorkflowStore((s) => s.setShortcutsOpen);

  // Platform sniff — runs once at mount.
  const [modKey, setModKey] = React.useState("⌘");
  React.useEffect(() => {
    const platform =
      typeof navigator !== "undefined"
        ? (navigator.platform || "").toLowerCase()
        : "";
    setModKey(platform.includes("mac") ? "⌘" : "Ctrl");
  }, []);

  // Global keybinding handler. We attach to window so the dialog can open
  // regardless of where focus is, but we still respect input fields.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "?" && !open && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const groups = React.useMemo(() => buildGroups(modKey), [modKey]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background">
                  <Command className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold tracking-tight text-foreground">
                    Keyboard shortcuts
                  </h2>
                  <p className="font-mono text-[10.5px] text-muted-foreground">
                    Every move the editor knows
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body — three columns of grouped shortcuts */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-5 py-5 sm:grid-cols-3">
              {groups.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.title}
                  </h3>
                  <ul className="space-y-2.5">
                    {group.items.map((item) => (
                      <li
                        key={item.description}
                        className="flex items-start justify-between gap-3"
                      >
                        <span className="text-[12.5px] leading-snug text-muted-foreground">
                          {item.description}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {item.keys.map((k, i) => (
                            <kbd
                              key={i}
                              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1.5 font-mono text-[10.5px] font-medium text-foreground shadow-elevation-1"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-muted/30 px-5 py-3">
              <p className="text-[11.5px] text-muted-foreground">
                Tip: press{" "}
                <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
                  ?
                </kbd>{" "}
                from anywhere in the editor to reopen this dialog.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
