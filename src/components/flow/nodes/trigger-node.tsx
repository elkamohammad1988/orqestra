"use client";

/**
 * Trigger node — the entry point of a workflow.
 *
 * No `target` handle: triggers don't receive input from other nodes.
 * The source field (`manual` / `webhook` / `schedule`) shows in the body
 * preview; full configuration happens in the inspector.
 */

import { type NodeProps } from "reactflow";
import { Zap, Webhook, Clock, MousePointer2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { BaseNode } from "./base-node";
import type { TriggerData } from "@/lib/workflow/types";

const sourceIconMap = {
  manual: MousePointer2,
  webhook: Webhook,
  schedule: Clock,
};

export function TriggerNode({ id, data, selected }: NodeProps<TriggerData>) {
  // Subscribe to the run status for THIS node only — no re-renders when
  // other nodes' statuses change. This is the value-selector pattern.
  const status = useWorkflowStore((s) => s.runStatus[id] ?? "idle");

  const SourceIcon = sourceIconMap[data.source];

  return (
    <BaseNode
      icon={Zap}
      label={data.label || "Trigger"}
      hasInput={false}
      selected={selected}
      status={status}
      preview={
        <div className="flex items-center gap-1.5">
          <SourceIcon className="h-3 w-3" />
          <span>{data.source}</span>
          {data.config && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate text-foreground">{data.config}</span>
            </>
          )}
        </div>
      }
    />
  );
}
