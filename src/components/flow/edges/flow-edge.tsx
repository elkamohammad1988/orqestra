"use client";

/**
 * Custom edge — replaces React Flow's default to give us:
 *   1. A clean bezier path styled by our CSS (.react-flow__edge-path).
 *   2. An ACTIVE-state overlay: when the source node is `running` or
 *      `success` AND its target is `queued`/`running`, we layer a second
 *      animated dashed path on top. The "marching ants" visually carries
 *      the flow forward and is what makes a live run feel alive.
 *
 * Important: the activeness is DERIVED from runStatus, never stored on
 * the edge itself. The edge is just a visual derivative of node state.
 */

import * as React from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";
import { useWorkflowStore } from "@/lib/workflow/store";

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  // Read just the two statuses this edge cares about. Granular selectors
  // mean the edge re-renders only when its own endpoints change state.
  const sourceStatus = useWorkflowStore(
    (s) => s.runStatus[source] ?? "idle",
  );
  const targetStatus = useWorkflowStore(
    (s) => s.runStatus[target] ?? "idle",
  );

  // "Active" = the data has flowed past source and is on its way to target.
  // We light up between "source completed" and "target completed/failed".
  const isActive =
    (sourceStatus === "running" || sourceStatus === "success") &&
    targetStatus !== "success" &&
    targetStatus !== "error";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
      />
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="hsl(var(--brand-500))"
          strokeWidth={1.8}
          strokeDasharray="4 6"
          className="flow-line"
          style={{ pointerEvents: "none" }}
        />
      )}
      {/* Wider invisible hit-target so clicking the edge is forgiving */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="react-flow__edge-interaction"
      />
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="hsl(var(--foreground) / 0.15)"
          strokeWidth={6}
          style={{ pointerEvents: "none" }}
        />
      )}
    </>
  );
}
