"use client";

/**
 * AI Step node — calls a language model with a prompt.
 *
 * During a run, this node also shows a LIVE STREAMING PREVIEW of the
 * tokens arriving from Claude. We read the running text from the store's
 * `runTokens[id]` slot and truncate to the tail so the node card doesn't
 * blow out its width on long generations. The full output lives in the
 * run console at the bottom of the editor.
 */

import { type NodeProps } from "reactflow";
import { Sparkles } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { BaseNode } from "./base-node";
import type { AIStepData } from "@/lib/workflow/types";

export function AIStepNode({ id, data, selected }: NodeProps<AIStepData>) {
  const status = useWorkflowStore((s) => s.runStatus[id] ?? "idle");
  const tokens = useWorkflowStore((s) => s.runTokens[id]);

  // When streaming, surface the last ~50 chars as a live preview. When the
  // run finished, the full text would overflow — we let the console own it.
  const livePreview =
    tokens && status === "running"
      ? tokens.length > 60
        ? "…" + tokens.slice(-58)
        : tokens
      : null;

  return (
    <BaseNode
      icon={Sparkles}
      label={data.label || "AI Step"}
      accent
      selected={selected}
      status={status}
      preview={
        livePreview ? (
          <div className="font-mono text-foreground type-cursor">
            {livePreview}
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">model</span>
              <span className="text-foreground">{data.model}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">temp</span>
              <span className="text-foreground">
                {data.temperature.toFixed(2)}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">max</span>
              <span className="text-foreground">{data.maxTokens}</span>
            </div>
          </div>
        )
      }
    />
  );
}
