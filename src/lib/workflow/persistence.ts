/**
 * Workflow persistence — Supabase CRUD.
 *
 * SERVER-SIDE ONLY. These functions use the server Supabase client (which
 * reads the current user from cookies). Calling them from a Client
 * Component will throw — by design.
 *
 * RLS does the heavy security work: even if a bug here forgot to filter
 * by user_id, Postgres still wouldn't return another user's rows. Keep
 * RLS as the safety net, not the primary check.
 */

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { Workflow, WorkflowEdge, WorkflowNode } from "@/types";

/**
 * Shape returned by the DB. Matches schema.sql column-for-column.
 * `nodes` and `edges` come back as JSONB → already-parsed JS values.
 */
interface WorkflowRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  webhook_token: string;
  created_at: string;
  updated_at: string;
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    description: row.description,
    nodes: row.nodes ?? [],
    edges: row.edges ?? [],
    webhook_token: row.webhook_token,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** List the current user's workflows, most-recently-updated first. */
export async function listWorkflows(): Promise<Workflow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[persistence] listWorkflows:", error.message);
    return [];
  }
  return (data ?? []).map(rowToWorkflow);
}

/** Fetch a single workflow by id. Returns null if not found OR not owned. */
export async function getWorkflow(id: string): Promise<Workflow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[persistence] getWorkflow:", error.message);
    return null;
  }
  return data ? rowToWorkflow(data) : null;
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export interface UpsertWorkflowInput {
  /** Omit for a new workflow — Postgres will assign a UUID. */
  id?: string;
  name: string;
  description?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * Insert-or-update. We use `upsert` so the same code path handles both
 * "save a brand-new workflow" and "save an existing one". The `user_id`
 * is always derived server-side from the session — never trust the
 * client to send it.
 */
export async function upsertWorkflow(
  input: UpsertWorkflowInput,
): Promise<Workflow | null> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Save is disabled.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  // Build the row server-side. user_id NEVER comes from input.
  const row = {
    ...(input.id ? { id: input.id } : {}),
    user_id: user.id,
    name: input.name,
    description: input.description ?? null,
    nodes: input.nodes,
    edges: input.edges,
  };

  const { data, error } = await supabase
    .from("workflows")
    .upsert(row)
    .select("*")
    .single();

  if (error) {
    console.error("[persistence] upsertWorkflow:", error.message);
    return null;
  }
  return rowToWorkflow(data);
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = createClient();
  const { error } = await supabase.from("workflows").delete().eq("id", id);
  if (error) {
    console.error("[persistence] deleteWorkflow:", error.message);
    return false;
  }
  return true;
}

/**
 * Clone a workflow by id, preserving nodes/edges and prefixing the name
 * with "Copy of". Returns the new workflow or null on failure.
 *
 * RLS guarantees we can only read (and therefore copy) workflows we own.
 */
export async function duplicateWorkflow(id: string): Promise<Workflow | null> {
  const source = await getWorkflow(id);
  if (!source) return null;
  return upsertWorkflow({
    name: `Copy of ${source.name}`,
    description: source.description,
    nodes: source.nodes,
    edges: source.edges,
  });
}
