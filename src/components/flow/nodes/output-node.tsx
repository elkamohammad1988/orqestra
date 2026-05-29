"use client";

/**
 * Output node — the terminal step of a workflow.
 *
 * No `source` handle: nothing flows out of an output. The terminal-ness is
 * what marks a node as a leaf when we eventually topologically sort the
 * graph for execution.
 */

import { type NodeProps } from "reactflow";
import { Send, MessageSquare, Webhook, Mail } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { BaseNode } from "./base-node";
import type { OutputData } from "@/lib/workflow/types";

const destIconMap = {
  console: Send,
  webhook: Webhook,
  slack: MessageSquare,
  email: Mail,
};

export function OutputNode({ id, data, selected }: NodeProps<OutputData>) {
  const status = useWorkflowStore((s) => s.runStatus[id] ?? "idle");

  const DestIcon = destIconMap[data.destination];

  return (
    <BaseNode
      icon={Send}
      label={data.label || "Output"}
      hasOutput={false}
      selected={selected}
      status={status}
      preview={
        <div className="flex items-center gap-1.5">
          <DestIcon className="h-3 w-3" />
          <span>{data.destination}</span>
          {data.target && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate text-foreground">{data.target}</span>
            </>
          )}
        </div>
      }
    />
  );
}
