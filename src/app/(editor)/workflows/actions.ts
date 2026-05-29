"use server";

/**
 * Workflow server actions — Save and Delete from the editor.
 *
 * These mirror lib/workflow/persistence.ts but are exposed to the client
 * via Server Actions. The Save button calls `saveWorkflowAction(workflow)`
 * from a Client Component; Next ships the payload to the server, runs
 * this code, and returns the result.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Workflow, WorkflowNode, WorkflowEdge } from "@/types";
import {
  upsertWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
} from "@/lib/workflow/persistence";
import { isSupabaseConfigured } from "@/lib/env";
import { SaveWorkflowInputSchema } from "@/lib/validation/workflow";

export interface SaveResult {
  ok: boolean;
  workflow?: Workflow;
  error?: string;
}

export interface SaveInput {
  id?: string;
  name: string;
  description?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// UUIDs only — accepts the standard 8-4-4-4-12 hex format. The persistence
// helpers ALSO check ownership via RLS, but rejecting non-UUID strings at
// the action boundary spares us a wasted DB call on garbage input.
const WorkflowIdSchema = z.string().uuid();

export async function saveWorkflowAction(input: SaveInput): Promise<SaveResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error:
        "Save is disabled in demo mode. Sign in (and configure Supabase) to persist your workflows.",
    };
  }

  const parsed = SaveWorkflowInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid workflow data.",
    };
  }

  try {
    const workflow = await upsertWorkflow(parsed.data);
    if (!workflow) {
      return { ok: false, error: "Could not save workflow." };
    }
    // Invalidate the dashboard + list views so the new/updated row shows up.
    revalidatePath("/dashboard");
    revalidatePath("/workflows");
    return { ok: true, workflow };
  } catch {
    // Don't echo the raw error string — it can include Postgres details
    // (column names, constraint names) that aren't useful to the user and
    // shouldn't leave the server. The persistence helpers already log to
    // the server for diagnosis.
    return {
      ok: false,
      error: "We couldn't save your workflow. Please try again.",
    };
  }
}

export async function deleteWorkflowAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Demo mode." };
  const idCheck = WorkflowIdSchema.safeParse(id);
  if (!idCheck.success) {
    return { ok: false, error: "Invalid workflow id." };
  }
  const ok = await deleteWorkflow(idCheck.data);
  if (ok) {
    revalidatePath("/dashboard");
    revalidatePath("/workflows");
  }
  return { ok };
}

export async function duplicateWorkflowAction(
  id: string,
): Promise<SaveResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Demo mode." };
  }
  const idCheck = WorkflowIdSchema.safeParse(id);
  if (!idCheck.success) {
    return { ok: false, error: "Invalid workflow id." };
  }
  try {
    const workflow = await duplicateWorkflow(idCheck.data);
    if (!workflow) {
      return { ok: false, error: "Could not duplicate workflow." };
    }
    revalidatePath("/dashboard");
    revalidatePath("/workflows");
    return { ok: true, workflow };
  } catch {
    return {
      ok: false,
      error: "We couldn't duplicate this workflow. Please try again.",
    };
  }
}
