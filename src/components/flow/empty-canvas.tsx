"use client";

/**
 * Empty canvas state.
 *
 * Two visual modes:
 *  - `active = false` (default) — soft prompt card with affordances.
 *  - `active = true` — the user is currently dragging from the library
 *    onto the empty canvas. The card dims and a "drop anywhere" hint
 *    becomes the dominant element. Pure visual feedback, the actual drop
 *    is handled by editor.tsx's onDrop.
 */

import { motion } from "framer-motion";
import { MousePointer2, Sparkles, Keyboard, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyCanvasProps {
  active?: boolean;
}

export function EmptyCanvas({ active = false }: EmptyCanvasProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      <div
        className={cn(
          "pointer-events-auto max-w-md rounded-2xl border bg-background/70 p-8 text-center backdrop-blur transition-all duration-200",
          active
            ? "scale-[1.02] border-brand-500/40 bg-brand-500/[0.04] shadow-elevation-3"
            : "border-dashed border-border",
        )}
      >
        <div
          className={cn(
            "mx-auto inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-brand-500 text-background"
              : "bg-foreground text-background",
          )}
        >
          {active ? (
            <ArrowDownToLine className="h-[18px] w-[18px]" />
          ) : (
            <Sparkles className="h-[18px] w-[18px]" />
          )}
        </div>
        <h3 className="mt-4 text-[18px] font-semibold tracking-tight text-foreground">
          {active ? "Drop it anywhere" : "A blank canvas, ready to compose."}
        </h3>
        <p
          className={cn(
            "mt-2 text-pretty text-[13.5px] leading-relaxed transition-colors",
            active ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          {active ? (
            "Release to add the node at the cursor."
          ) : (
            <>
              Start by dragging a{" "}
              <span className="text-foreground">Trigger</span> from the left
              rail. Then add an{" "}
              <span className="text-foreground">AI Step</span> and an{" "}
              <span className="text-foreground">Output</span> — that&apos;s a
              complete workflow.
            </>
          )}
        </p>

        {!active && (
          <ul className="mx-auto mt-6 grid max-w-xs gap-2 text-left text-[12px]">
            <li className="flex items-center gap-2 text-muted-foreground">
              <MousePointer2 className="h-3 w-3" />
              Drag any node from the library
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <Keyboard className="h-3 w-3" />
              Press{" "}
              <kbd className="rounded border border-border bg-card px-1 font-mono text-[10px]">
                ?
              </kbd>{" "}
              for keyboard shortcuts
            </li>
          </ul>
        )}
      </div>
    </motion.div>
  );
}
