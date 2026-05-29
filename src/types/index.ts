/**
 * Shared domain types — the single source of truth for what a workflow,
 * node, edge, and user look like across the entire app.
 *
 * Mirrors the table shapes in supabase/schema.sql column-for-column so a
 * row coming out of the database is directly assignable to the type.
 */

// The four node kinds map 1:1 to the React Flow custom node components.
// Adding a new kind is a four-step change:
//   1. Add the literal here.
//   2. Add a renderer in components/flow/nodes/.
//   3. Add an executor in lib/workflow/run.ts.
//   4. Add a library entry in the editor's node palette.
export type WorkflowNodeKind = "trigger" | "ai_step" | "transform" | "output";

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  /** Per-workflow token authenticating inbound webhook POSTs. */
  webhook_token: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

// Mirrors the shape of `public.runs` in supabase/schema.sql. `events` is
// stored as JSONB and contains the full RunEvent stream from a run — keep
// this type loose (`unknown[]`) so the run engine can evolve its event
// shapes without forcing a schema migration here.
export type RunStatus = "running" | "success" | "failed" | "canceled";
export type RunTrigger = "manual" | "schedule" | "webhook" | "api";

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: RunStatus;
  trigger: RunTrigger;
  trigger_input: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  token_count: number;
  error_message: string | null;
  events: unknown[];
  created_at: string;
}
