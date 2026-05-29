/**
 * Runs persistence — Supabase CRUD for the `runs` table.
 *
 * SERVER-SIDE ONLY. Uses the cookie-bound server client, so every call
 * is scoped to the authenticated user via RLS. The route handler is the
 * only caller that's expected to write (createRun + finishRun); the rest
 * of the app (dashboard, runs list, run detail page) only reads.
 *
 * "Approximate" token count: we don't have access to Anthropic's per-call
 * usage object in the streaming path yet, so the route counts characters
 * across all node_token events and divides by 4 (the rough English
 * tokens-per-character ratio). Good enough to populate "tokens used" in
 * the dashboard; a later pass will replace it with real `message.usage`
 * values once we plumb the SDK's final-message hook through the executor.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  RunStatus,
  RunTrigger,
  WorkflowRun,
} from "@/types";

interface RunRow {
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

function rowToRun(row: RunRow): WorkflowRun {
  return {
    id: row.id,
    workflow_id: row.workflow_id,
    user_id: row.user_id,
    status: row.status,
    trigger: row.trigger,
    trigger_input: row.trigger_input,
    started_at: row.started_at,
    finished_at: row.finished_at,
    duration_ms: row.duration_ms,
    token_count: row.token_count ?? 0,
    error_message: row.error_message,
    events: row.events ?? [],
    created_at: row.created_at,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

export interface CreateRunInput {
  workflowId: string;
  triggerInput?: string;
  trigger?: RunTrigger;
}

/**
 * Insert a `runs` row in `running` state. Returns the new run id, or `null`
 * if persistence is unavailable (Supabase not configured, no session, or
 * the workflow id isn't owned by the caller). The route handler then runs
 * the workflow anyway — we just won't have a row to update at the end.
 */
export async function createRun(
  input: CreateRunInput,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  if (!isUuid(input.workflowId)) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Verify the workflow exists AND is owned by this user. RLS would also
  // catch the cross-user case, but a pre-check gives us a cleaner null
  // return instead of an opaque insert error.
  const { data: workflow } = await supabase
    .from("workflows")
    .select("id")
    .eq("id", input.workflowId)
    .maybeSingle();
  if (!workflow) return null;

  const { data, error } = await supabase
    .from("runs")
    .insert({
      workflow_id: input.workflowId,
      user_id: user.id,
      status: "running" as RunStatus,
      trigger: input.trigger ?? "manual",
      trigger_input: input.triggerInput ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[runs] createRun:", error.message);
    return null;
  }
  return data.id;
}

export interface FinishRunInput {
  status: Exclude<RunStatus, "running">;
  durationMs: number;
  tokenCount: number;
  errorMessage?: string | null;
  events: unknown[];
}

export async function finishRun(
  runId: string,
  input: FinishRunInput,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      duration_ms: input.durationMs,
      token_count: input.tokenCount,
      error_message: input.errorMessage ?? null,
      events: input.events,
    })
    .eq("id", runId);

  if (error) {
    console.error("[runs] finishRun:", error.message);
  }
}

// ─── Admin writes (for webhook-triggered runs with no user session) ─────────

/**
 * Webhook runs aren't initiated by a logged-in user, so we can't rely on
 * RLS. These helpers bypass it via the service-role client and require the
 * caller to pre-resolve the workflow's `user_id`. Returns null and logs
 * if the service role isn't configured — webhook callers fall back to
 * running unpersisted.
 */
export interface CreateRunAsAdminInput {
  workflowId: string;
  userId: string;
  trigger: RunTrigger;
  triggerInput?: string;
}

export async function createRunAsAdmin(
  input: CreateRunAsAdminInput,
): Promise<string | null> {
  if (!hasServiceRole()) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("runs")
    .insert({
      workflow_id: input.workflowId,
      user_id: input.userId,
      status: "running" as RunStatus,
      trigger: input.trigger,
      trigger_input: input.triggerInput ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[runs] createRunAsAdmin:", error.message);
    return null;
  }
  return data.id;
}

export async function finishRunAsAdmin(
  runId: string,
  input: FinishRunInput,
): Promise<void> {
  if (!hasServiceRole()) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("runs")
    .update({
      status: input.status,
      finished_at: new Date().toISOString(),
      duration_ms: input.durationMs,
      token_count: input.tokenCount,
      error_message: input.errorMessage ?? null,
      events: input.events,
    })
    .eq("id", runId);
  if (error) {
    console.error("[runs] finishRunAsAdmin:", error.message);
  }
}

// ─── Reads ──────────────────────────────────────────────────────────────────

/** Most-recent N runs for the current user, across all workflows. */
export async function listRecentRuns(limit = 25): Promise<WorkflowRun[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[runs] listRecentRuns:", error.message);
    return [];
  }
  return (data ?? []).map(rowToRun);
}

/** Returns the run + the workflow name (handy for the detail page header). */
export async function getRun(
  id: string,
): Promise<(WorkflowRun & { workflow_name: string }) | null> {
  if (!isSupabaseConfigured()) return null;
  if (!isUuid(id)) return null;
  const supabase = createClient();
  // Embed the parent workflow's name via PostgREST's foreign-key join syntax.
  // RLS still applies to both tables.
  const { data, error } = await supabase
    .from("runs")
    .select("*, workflows(name)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[runs] getRun:", error.message);
    return null;
  }
  const { workflows, ...rest } = data as RunRow & {
    workflows: { name: string } | null;
  };
  return {
    ...rowToRun(rest),
    workflow_name: workflows?.name ?? "Workflow",
  };
}
