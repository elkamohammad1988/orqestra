/**
 * Webhook trigger — POST /api/webhooks/[workflowId]
 *
 * Different beast from /api/workflows/run:
 *   • There's no user session. The caller is some external system (Zapier,
 *     a cron job, a frontend integration) holding a per-workflow token.
 *   • The response is BUFFERED JSON, not SSE — webhooks expect a final
 *     payload, not a stream of progress events.
 *   • Auth happens via the `webhook_token` column on the workflow row,
 *     checked against either `?token=` or the `X-Orqestra-Token` header.
 *
 * Persistence uses the admin client because there's no `auth.uid()` to
 * satisfy RLS. The webhook still requires `SUPABASE_SERVICE_ROLE_KEY` to
 * write a run row — without it, the request still 200s with the output,
 * but the run won't appear in the runs page.
 *
 * Rate limiting is applied per-workflow rather than per-IP because a
 * webhook is a fan-in point — one workflow may receive bursts from many
 * different sources, and we don't want to block them as a side effect of
 * the platform-level IP throttle.
 */

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { runWorkflow, type RunEvent } from "@/lib/workflow/run";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createRunAsAdmin, finishRunAsAdmin } from "@/lib/workflow/runs";
import type { Workflow, RunStatus } from "@/types";

/**
 * Cap on the request body. Trigger inputs over this size are rejected
 * before we even run the workflow — the Postgres `text` column has no
 * length limit, so without this an abusive caller could fill the runs
 * table with multi-megabyte payloads.
 *
 * 64 KB is enough for any reasonable webhook payload (a Slack event, a
 * Stripe invoice, a Linear issue body) and small enough that storing one
 * per run doesn't bloat backups.
 */
const MAX_TRIGGER_INPUT_BYTES = 64 * 1024;

/**
 * Constant-time UUID comparison.
 *
 * Even though webhook_tokens are random UUIDs (where timing leaks don't
 * meaningfully help an attacker), routing the comparison through
 * timingSafeEqual is cheap and removes a foot-gun if the token format
 * ever changes to something more sensitive (e.g. an HMAC of an HMAC).
 */
function tokensMatch(supplied: string, stored: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

interface RunOutput {
  nodeId: string;
  output: string;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { workflowId: string } },
) {
  if (!isSupabaseConfigured() || !hasServiceRole()) {
    return jsonResponse(503, {
      error:
        "Webhook triggers require Supabase + a service role key to be configured.",
    });
  }

  const token =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-orqestra-token");
  if (!token) {
    return jsonResponse(401, {
      error: "Missing token. Pass ?token=… or X-Orqestra-Token header.",
    });
  }

  // ── 1. Look up workflow by id via admin client ──────────────────────────
  // We fetch by id only, then compare tokens in constant time. Looking up
  // by id-AND-token in SQL would do the same thing in roughly constant
  // time for random UUIDs anyway, but separating the two lets us swap to
  // a higher-entropy token format later without rewriting this branch.
  const admin = createAdminClient();
  const { data: workflowRow, error: lookupError } = await admin
    .from("workflows")
    .select("*")
    .eq("id", params.workflowId)
    .maybeSingle();
  if (lookupError) {
    return jsonResponse(500, { error: "Workflow lookup failed." });
  }
  if (!workflowRow || !tokensMatch(token, workflowRow.webhook_token)) {
    // Don't disclose whether the id or the token was wrong — same response
    // either way avoids leaking which workflows exist.
    return jsonResponse(404, { error: "Workflow not found." });
  }
  const workflow = workflowRow as Workflow;

  // ── 2. Rate limit (per workflow) ────────────────────────────────────────
  const rl = await checkRateLimit("webhook", workflow.id);
  if (!rl.success) {
    return jsonResponse(429, {
      error: "Too many webhook calls. Try again in a moment.",
      retryAfter: rl.retryAfter,
    });
  }

  // ── 3. Body → triggerInput ─────────────────────────────────────────────
  // Accept three shapes:
  //   {"input": "..."}     → use input
  //   any JSON             → stringify the whole thing
  //   non-JSON text body   → use raw text
  // Empty bodies become "" so the workflow still runs.
  //
  // A Content-Length header lets us reject oversized payloads BEFORE
  // buffering them. For chunked uploads (no header) we still cap after
  // reading via a byte-length check.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_TRIGGER_INPUT_BYTES) {
    return jsonResponse(413, {
      error: `Payload too large. Limit is ${MAX_TRIGGER_INPUT_BYTES} bytes.`,
    });
  }

  let triggerInput = "";
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > MAX_TRIGGER_INPUT_BYTES) {
      return jsonResponse(413, {
        error: `Payload too large. Limit is ${MAX_TRIGGER_INPUT_BYTES} bytes.`,
      });
    }
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (
          parsed &&
          typeof parsed === "object" &&
          "input" in parsed &&
          typeof (parsed as Record<string, unknown>).input === "string"
        ) {
          triggerInput = (parsed as { input: string }).input;
        } else {
          triggerInput = text;
        }
      } catch {
        triggerInput = text;
      }
    }
  } catch {
    return jsonResponse(400, { error: "Failed to read request body." });
  }

  // ── 4. Run + buffer events ──────────────────────────────────────────────
  const startedAt = Date.now();
  const runId = await createRunAsAdmin({
    workflowId: workflow.id,
    userId: workflow.user_id,
    trigger: "webhook",
    triggerInput,
  });

  const eventBuffer: RunEvent[] = [];
  const outputs: RunOutput[] = [];
  let tokenChars = 0;
  let finalStatus: Exclude<RunStatus, "running"> = "success";
  let errorMessage: string | null = null;

  try {
    for await (const event of runWorkflow(workflow, { triggerInput })) {
      eventBuffer.push(event);
      if (event.type === "node_token") tokenChars += event.token.length;
      if (event.type === "node_output") {
        outputs.push({ nodeId: event.nodeId, output: event.output });
      }
      if (event.type === "run_error") {
        finalStatus = "failed";
        errorMessage = event.error;
      }
    }
  } catch (err) {
    finalStatus = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const durationMs = Date.now() - startedAt;

  if (runId) {
    await finishRunAsAdmin(runId, {
      status: finalStatus,
      durationMs,
      tokenCount: Math.round(tokenChars / 4),
      errorMessage,
      events: eventBuffer,
    });
  }

  // ── 5. Respond ──────────────────────────────────────────────────────────
  // For output destinations the actual "result" of the workflow is the
  // outputs of the terminal nodes. The caller usually only cares about
  // those — but we include all of them so the webhook contract isn't a
  // black box.
  return jsonResponse(finalStatus === "success" ? 200 : 422, {
    runId,
    status: finalStatus,
    durationMs,
    outputs,
    error: errorMessage,
  });
}
