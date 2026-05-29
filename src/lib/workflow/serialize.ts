/**
 * Serialization between *editor state* (React Flow's Node/Edge shape) and
 * the *domain shape* we persist (lib/workflow/types.ts).
 *
 * Why have two shapes at all?
 *  - React Flow's Node carries render-only fields: `selected`, `dragging`,
 *    `width`, `height`, `positionAbsolute`, etc. We don't want any of that
 *    in the database row — they're ephemeral UI state.
 *  - The domain shape is a clean contract: id, kind, position, data. That's
 *    the JSON we round-trip through Supabase, REST APIs, and YAML exports.
 *
 * Keeping the two shapes separated also means the editor implementation
 * (React Flow specifically) is a swappable detail — if we ever migrated
 * canvases, only `serialize.ts` would change.
 */

import type { Edge, Node } from "reactflow";
import type { Workflow, WorkflowEdge, WorkflowNode } from "@/types";
import type { WorkflowNodeData } from "./types";

// React Flow → domain ─────────────────────────────────────────────────────

export function nodeToDomain(node: Node<WorkflowNodeData>): WorkflowNode {
  return {
    id: node.id,
    kind: (node.data as WorkflowNodeData).kind,
    position: node.position,
    // We persist the full per-kind data blob, discriminator and all.
    // Postgres can store this as JSONB; the discriminated union deserializes
    // back into a type-safe value on read.
    data: node.data as unknown as Record<string, unknown>,
  };
}

export function edgeToDomain(edge: Edge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  };
}

// Domain → React Flow ─────────────────────────────────────────────────────

export function domainToNode(node: WorkflowNode): Node<WorkflowNodeData> {
  return {
    id: node.id,
    type: node.kind, // React Flow uses `type` to look up nodeTypes registry
    position: node.position,
    data: node.data as unknown as WorkflowNodeData,
  };
}

export function domainToEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    // Custom edge type registered in components/flow/edges (Phase 3 visuals).
    type: "default",
  };
}

// Whole-workflow helpers ──────────────────────────────────────────────────

export interface WorkflowSnapshot {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  meta: Pick<Workflow, "id" | "name" | "description">;
}

export function workflowToSnapshot(wf: Workflow): WorkflowSnapshot {
  return {
    nodes: wf.nodes.map(domainToNode),
    edges: wf.edges.map(domainToEdge),
    meta: { id: wf.id, name: wf.name, description: wf.description },
  };
}

export function snapshotToWorkflow(
  snapshot: WorkflowSnapshot,
  user_id: string,
): Workflow {
  const now = new Date().toISOString();
  return {
    id: snapshot.meta.id,
    user_id,
    name: snapshot.meta.name,
    description: snapshot.meta.description,
    nodes: snapshot.nodes.map(nodeToDomain),
    edges: snapshot.edges.map(edgeToDomain),
    // Client-only ephemeral snapshot — the real token is assigned by the
    // database on first save. Callers that care (the webhook panel) read
    // the token from the store, which gets populated on save / load.
    webhook_token: "",
    created_at: now,
    updated_at: now,
  };
}
