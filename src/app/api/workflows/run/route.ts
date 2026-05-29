/**
 * Run orchestrator — POST /api/workflows/run
 *
 * ─── HOW SSE STREAMING WORKS HERE ────────────────────────────────────────────
 *
 *  SSE (Server-Sent Events) is a one-way streaming protocol over plain HTTP.
 *  The response uses `Content-Type: text/event-stream` and the body is an
 *  open connection where the server writes formatted text messages:
 *
 *      event: node_status
 *      data: {"nodeId":"n_classify","status":"running"}
 *      \n
 *
 *  Each message ends with a BLANK LINE (\n\n). The client (browser) parses
 *  them with a TextDecoder and dispatches based on the `event:` line.
 *
 *  Why SSE and not WebSockets? SSE is fire-and-forget HTTP — works through
 *  every proxy, no upgrade handshake, no socket lifecycle to manage. We
 *  never need the client → server direction during a run, so a full-duplex
 *  WebSocket would be overkill.
 *
 *  Runtime choice — Node.js, not Edge:
 *    The Anthropic SDK pulls in a few Node-only modules through its beta
 *    agent toolset (node:fs, node:path). Bundling those into Edge fails.
 *    Node functions on Vercel also support streaming responses (since Next
 *    13.4) and let us set maxDuration up to 60s on Hobby, which is plenty
 *    given our MAX_RUN_WALL_MS = 25s self-cap.
 *
 * ─── PERSISTENCE ────────────────────────────────────────────────────────────
 *
 *  When the caller is authenticated AND the workflow id is a UUID we own,
 *  we record a `runs` row at the start (`status='running'`), buffer every
 *  event into memory, then update the row at the end with the final status,
 *  duration, approximate token count, and full event log. Unauthenticated
 *  demo runs skip persistence entirely — there's no user to attribute them
 *  to and the dashboard never needs to show them.
 *
 * ─── DEMO ACCESS ────────────────────────────────────────────────────────────
 *
 *  This route DOES NOT require authentication. That's intentional — anyone
 *  visiting the portfolio can try the demo workflow without signing up.
 *  Cost protection comes from `lib/workflow/limits.ts` (token caps, step
 *  caps, wall-clock budget) plus `lib/rate-limit.ts` (per-IP throttle).
 *
 *  Authenticated runs get a slightly more generous rate-limit key (user_id)
 *  so two people behind the same NAT don't collide.
 */

import type { NextRequest } from "next/server";
import { runWorkflow, type RunEvent } from "@/lib/workflow/run";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createRun, finishRun } from "@/lib/workflow/runs";
import { RunRequestBodySchema } from "@/lib/validation/workflow";
import type { Workflow, RunStatus } from "@/types";

/** Hard cap on the request body itself. Anything larger is rejected
 * before JSON.parse even runs, so a 100 MB payload can't pin a Lambda. */
const MAX_RUN_BODY_BYTES = 256 * 1024;

export const runtime = "nodejs";
// Vercel maxDuration. Hobby caps at 60s; we stay well under via our own
// MAX_RUN_WALL_MS limit in lib/workflow/limits.ts.
export const maxDuration = 30;
// Force dynamic — we never want this cached as a static response.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ── 1. Identify the caller (auth optional) ───────────────────────────────
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Anonymous run — proceed with IP-based rate limiting.
    }
  }

  // ── 2. Rate limit ────────────────────────────────────────────────────────
  // Anonymous demo runs get a stricter window than signed-in users — the
  // demo path is the one publicly reachable surface that hits Anthropic on
  // our dime, so we want it harder to abuse.
  const rl = await checkRateLimit(
    userId ? "run" : "demo",
    rateLimitKey(request, userId),
  );
  if (!rl.success) {
    return new Response(
      JSON.stringify({
        error: "Too many runs. Try again in a moment.",
        retryAfter: rl.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfter),
        },
      },
    );
  }

  // ── 3. Parse + validate body ─────────────────────────────────────────────
  // The Content-Length pre-check rejects oversized payloads before we
  // buffer them. The Zod schema enforces node/edge counts and shape.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RUN_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: "Payload too large." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = RunRequestBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    // Surface the first validation message so the editor can show what
    // went wrong (e.g., "Workflow exceeds the 50-node limit.") without
    // leaking the full Zod issue tree.
    const first = parsed.error.issues[0];
    return new Response(
      JSON.stringify({
        error: first?.message ?? "Invalid workflow payload.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  // The parsed body is `{ workflow, triggerInput }` — unwrap to the
  // workflow itself before handing to the orchestrator. Casting through
  // because the Workflow domain type has required `webhook_token`,
  // `created_at`, `updated_at` fields that ephemeral client payloads
  // don't always include. The executor doesn't read them.
  const workflow = parsed.data.workflow as unknown as Workflow;
  const triggerInput = parsed.data.triggerInput;

  // ── 4. Open a persisted run if we can ─────────────────────────────────────
  // Returns null for anonymous callers or unsaved (non-UUID) workflows.
  // We `await` here BEFORE constructing the stream so the row exists by
  // the time the first event flushes — keeps things simple at the cost of
  // a few extra ms of latency.
  const runId = userId
    ? await createRun({
        workflowId: workflow.id,
        triggerInput,
      })
    : null;

  // ── 5. Build the SSE stream ──────────────────────────────────────────────
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  // Buffered for the final DB write. We don't write per-event to avoid
  // hammering Postgres with hundreds of UPDATEs during a streaming run.
  const eventBuffer: RunEvent[] = [];
  let tokenChars = 0;
  let finalStatus: Exclude<RunStatus, "running"> = "success";
  let errorMessage: string | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: RunEvent) => {
        eventBuffer.push(event);
        if (event.type === "node_token") {
          tokenChars += event.token.length;
        }
        if (event.type === "run_error") {
          finalStatus = "failed";
          errorMessage = event.error;
        }
        const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Consumer disconnected — keep buffering so finishRun still gets
          // the partial event log, but stop trying to enqueue.
        }
      };

      try {
        for await (const event of runWorkflow(workflow, {
          triggerInput,
        })) {
          sendEvent(event);
        }
      } catch (err) {
        finalStatus = "failed";
        errorMessage = err instanceof Error ? err.message : String(err);
        sendEvent({ type: "run_error", error: errorMessage });
      } finally {
        // Always close the wire AND record the run, even on errors. Closing
        // is mandatory or the browser hangs; recording is best-effort.
        try {
          controller.close();
        } catch {
          // Already closed (e.g. by a consumer disconnect). Ignore.
        }
        if (runId) {
          await finishRun(runId, {
            status: finalStatus,
            durationMs: Date.now() - startedAt,
            // Rough English heuristic: ~4 chars per token. Documented as
            // approximate in supabase/schema.sql.
            tokenCount: Math.round(tokenChars / 4),
            errorMessage,
            events: eventBuffer,
          });
        }
      }
    },
    cancel() {
      // The client closed the connection. Note: `start` is still mid-flight,
      // but its `finally` block will fire when its loop ends — that's where
      // we persist. We don't have a clean "this run was canceled" signal
      // from inside the generator, so for now we let it complete naturally
      // (the wall-clock budget caps it at 25s anyway).
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Tells Vercel + Nginx to not buffer the stream — without this, the
      // edge proxy may hold tokens for seconds before flushing them.
      "X-Accel-Buffering": "no",
    },
  });
}
