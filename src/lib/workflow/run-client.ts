"use client";

/**
 * Client-side SSE consumer.
 *
 * Walks the response body of POST /api/workflows/run and dispatches each
 * event into the workflow store. Pure logic — no React, no UI. The Run
 * button calls `runWorkflowOnClient(workflow)` and the store mutations
 * propagate to the nodes and console automatically.
 *
 * ─── WHY fetch(), NOT EventSource ────────────────────────────────────────
 *
 *  The browser's EventSource is convenient but only supports GET requests.
 *  We need to POST a workflow body, so we use plain fetch() + ReadableStream
 *  parsing instead. Same wire format, slightly more code.
 *
 * ─── SSE WIRE FORMAT (quick reference) ───────────────────────────────────
 *
 *      event: <event-type>\n
 *      data: <utf-8-payload>\n
 *      \n     ← blank line ends the message
 *
 *  Multiple data: lines concatenate. We don't use them.
 */

import { useWorkflowStore } from "@/lib/workflow/store";
import type { Workflow } from "@/types";
import type { RunEvent } from "@/lib/workflow/run";

export interface RunOptions {
  triggerInput?: string;
}

export async function runWorkflowOnClient(
  workflow: Workflow,
  options: RunOptions = {},
): Promise<void> {
  const store = useWorkflowStore.getState();
  store.startRun();

  try {
    const response = await fetch("/api/workflows/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow,
        triggerInput: options.triggerInput,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `Run failed (${response.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) message = parsed.error;
      } catch {
        // non-JSON body, keep generic message
      }
      store.finishRun(message);
      return;
    }

    if (!response.body) {
      store.finishRun("No stream returned from server.");
      return;
    }

    // ── Read the stream chunk-by-chunk ───────────────────────────────────
    // We can't trust chunk boundaries to align with SSE message boundaries
    // (a single chunk might cut a token in half). So we accumulate into a
    // buffer and only consume complete messages (terminated by \n\n).
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const messages = buffer.split("\n\n");
      // The last fragment may be a partial message — keep it for the next read.
      buffer = messages.pop() ?? "";

      for (const raw of messages) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const event = parseSSEMessage(trimmed);
        if (event) dispatchRunEvent(event);
      }
    }

    // If the stream closed without explicit run_complete, treat as success.
    if (useWorkflowStore.getState().isRunning) {
      store.finishRun();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.finishRun(message);
  }
}

// ─── SSE parsing ────────────────────────────────────────────────────────────

function parseSSEMessage(raw: string): RunEvent | null {
  let dataLine = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("data:")) {
      dataLine = line.slice(5).trim();
    }
    // We ignore the `event:` line because each event payload includes its
    // own `type` field — the JSON is self-describing.
  }
  if (!dataLine) return null;
  try {
    return JSON.parse(dataLine) as RunEvent;
  } catch {
    return null;
  }
}

// ─── Event dispatch ─────────────────────────────────────────────────────────

function dispatchRunEvent(event: RunEvent): void {
  const s = useWorkflowStore.getState();
  switch (event.type) {
    case "run_start":
      s.setQueuedAll(event.nodeIds);
      return;

    case "node_status":
      s.setNodeStatus(event.nodeId, event.status);
      return;

    case "node_token":
      s.appendToken(event.nodeId, event.token);
      return;

    case "node_output":
      s.setNodeOutput(event.nodeId, event.output);
      return;

    case "run_complete":
      s.finishRun();
      return;

    case "run_error":
      if (event.nodeId) s.setNodeStatus(event.nodeId, "error");
      s.finishRun(event.error);
      return;
  }
}
