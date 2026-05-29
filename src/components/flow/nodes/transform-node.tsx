"use client";

/**
 * Transform node — reshapes data between steps (extract JSON, run a
 * template, filter, …). Pure compute, no external calls.
 */

import { type NodeProps } from "reactflow";
import { Wand2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { BaseNode } from "./base-node";
import type { TransformData } from "@/lib/workflow/types";

export function TransformNode({ id, data, selected }: NodeProps<TransformData>) {
  const status = useWorkflowStore((s) => s.runStatus[id] ?? "idle");

  return (
    <BaseNode
      icon={Wand2}
      label={data.label || "Transform"}
      selected={selected}
      status={status}
      preview={
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">op</span>
            <span className="text-foreground">{data.operation}</span>
          </div>
          {data.expression && (
            <div className="truncate text-foreground">{data.expression}</div>
          )}
        </div>
      }
    />
  );
}
