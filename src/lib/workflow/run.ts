/**
 * Workflow execution engine — server-only.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE TWO HARD PARTS, EXPLAINED
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  1. TOPOLOGICAL SORT
 *     A workflow is a directed graph. To run it correctly, a node must
 *     never execute before any of its inputs. Topological sort gives us
 *     an ordering where for every edge A → B, A appears before B.
 *
 *     We use Kahn's algorithm:
 *       a) Build an `in-degree` count per node (how many incoming edges).
 *       b) Seed a queue with every node whose in-degree is 0 (the roots).
 *       c) Pop a node, append it to the output order, then "remove" it by
 *          decrementing the in-degree of each successor. If any successor
 *          drops to 0, enqueue it.
 *       d) Repeat until the queue is empty.
 *
 *     CYCLE DETECTION FALLS OUT FOR FREE: if the queue empties before
 *     we've processed every node, the remaining nodes form a cycle (none
 *     of them ever reached in-degree 0). We surface this as a clean error
 *     event instead of hanging or infinite-looping.
 *
 *  2. EVENT-STREAMING EXECUTION
 *     Long-running responses (streaming tokens from Claude over 10+
 *     seconds) need to deliver progress as it happens, not at the end.
 *     We model the whole run as an `AsyncGenerator<RunEvent>`. The route
 *     handler consumes it and re-emits each yielded event as an SSE
 *     message. This generator pattern keeps the protocol concerns (SSE
 *     wire format) separate from the execution concerns (which step is
 *     running, what its output was).
 *
 * ─── DATA FLOW BETWEEN NODES ────────────────────────────────────────────────
 *
 *  Each non-trigger node receives the output of its FIRST upstream
 *  predecessor as a string. Templates like `{{ input }}` expand to that
 *  value. `{{ trigger.text }}` expands to the original trigger input.
 *  Multi-input merging (joining two upstream outputs into one node's
 *  input) is intentionally deferred — it needs UI decisions (which input
 *  slot? what shape?) that aren't worth the complexity yet.
 */

import type {
  AIStepData,
  OutputData,
  TransformData,
  TriggerData,
  NodeStatus,
} from "./types";
import type { Workflow, WorkflowNode } from "@/types";
import { streamAIStep } from "@/lib/anthropic";
import { LIMITS, clampMaxTokens } from "./limits";

// ─── Event types ────────────────────────────────────────────────────────────

export type RunEvent =
  | { type: "run_start"; nodeIds: string[] }
  | { type: "node_status"; nodeId: string; status: NodeStatus }
  | { type: "node_token"; nodeId: string; token: string }
  | { type: "node_output"; nodeId: string; output: string }
  | { type: "run_complete" }
  | { type: "run_error"; error: string; nodeId?: string };

// ─── Topological sort ──────────────────────────────────────────────────────

/**
 * Returns an array of node ids in execution order, or `null` if the graph
 * contains a cycle.
 */
export function topologicalSort(workflow: Workflow): string[] | null {
  const nodeIds = workflow.nodes.map((n) => n.id);

  // Adjacency: source → [target, target, ...]
  const adj = new Map<string, string[]>();
  // In-degree: node → count of incoming edges
  const inDeg = new Map<string, number>();
  for (const id of nodeIds) {
    adj.set(id, []);
    inDeg.set(id, 0);
  }
  for (const e of workflow.edges) {
    // Defensive: edges that reference unknown nodes shouldn't happen in a
    // well-formed graph, but skipping them keeps the sort robust against
    // corrupt data.
    if (!inDeg.has(e.source) || !inDeg.has(e.target)) continue;
    adj.get(e.source)!.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = nodeIds.filter((id) => (inDeg.get(id) ?? 0) === 0);
  const order: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const succ of adj.get(id) ?? []) {
      const next = (inDeg.get(succ) ?? 0) - 1;
      inDeg.set(succ, next);
      if (next === 0) queue.push(succ);
    }
  }

  // If we didn't cover every node, the leftovers are inside a cycle.
  return order.length === nodeIds.length ? order : null;
}

// ─── Predecessor lookup ────────────────────────────────────────────────────

function firstPredecessor(workflow: Workflow, nodeId: string): string | null {
  const edge = workflow.edges.find((e) => e.target === nodeId);
  return edge ? edge.source : null;
}

// ─── Template expansion ────────────────────────────────────────────────────

/**
 * Replace `{{ input }}` and `{{ trigger.* }}` placeholders. Deliberately
 * NOT a full templating engine — no expressions, no conditionals. Just
 * variable insertion, which is all the demo needs and is safe to apply
 * to model outputs without sanitization.
 */
function expandTemplate(
  template: string,
  ctx: { input: string; trigger: string },
): string {
  return template
    .replace(/\{\{\s*input\s*\}\}/g, ctx.input)
    .replace(/\{\{\s*trigger(?:\.\w+)?\s*\}\}/g, ctx.trigger);
}

// ─── Per-kind executors ────────────────────────────────────────────────────

function executeTrigger(node: WorkflowNode, triggerInput: string): string {
  const data = node.data as unknown as TriggerData;
  // The trigger's job in Phase 3 is just to surface the run's seed input.
  // In a future release a webhook trigger would parse the request body; a schedule
  // trigger would inject the time-of-fire. For now: pass through.
  return triggerInput || (data.config ?? "");
}

function executeTransform(node: WorkflowNode, input: string, trigger: string): string {
  const data = node.data as unknown as TransformData;
  const expr = data.expression || "";

  switch (data.operation) {
    case "template":
      return expandTemplate(expr, { input, trigger });

    case "extract_json": {
      // Try to parse the upstream output as JSON, then walk the path. The
      // path syntax is a tiny subset: `$.a.b.c`. Anything richer (filters,
      // arrays) is a future release territory.
      let value: unknown = input;
      try {
        value = JSON.parse(input);
      } catch {
        // Not JSON — return the raw string so the run doesn't hard-fail.
        return input;
      }
      const path = expr.replace(/^\$\.?/, "");
      if (!path) return JSON.stringify(value);
      for (const key of path.split(".")) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return "";
        }
      }
      return typeof value === "string" ? value : JSON.stringify(value);
    }

    case "filter":
      // Baseline: pass-through. a future release will gate on a JS predicate.
      return input;
  }
}

function executeOutput(node: WorkflowNode, input: string): string {
  const data = node.data as unknown as OutputData;
  // Baseline: every destination logs to the run console. In Phase
  // 4 these branches send to Slack/webhook/email respectively.
  void data; // marks intent; suppresses unused-var lint
  return input;
}

// ─── The orchestrator (event generator) ─────────────────────────────────────

export interface RunOptions {
  /** Hard cap on wall-clock duration. Defaults to LIMITS.MAX_RUN_WALL_MS. */
  maxWallMs?: number;
  /** Seed input for the trigger node. */
  triggerInput?: string;
}

export async function* runWorkflow(
  workflow: Workflow,
  options: RunOptions = {},
): AsyncGenerator<RunEvent> {
  const startedAt = Date.now();
  const wallBudget = options.maxWallMs ?? LIMITS.MAX_RUN_WALL_MS;
  const triggerInput = options.triggerInput ?? "";

  // ── Pre-flight safety checks ────────────────────────────────────────────
  if (workflow.nodes.length > LIMITS.MAX_NODES_PER_WORKFLOW) {
    yield {
      type: "run_error",
      error: `Workflow has ${workflow.nodes.length} nodes (limit: ${LIMITS.MAX_NODES_PER_WORKFLOW}).`,
    };
    return;
  }
  const aiStepCount = workflow.nodes.filter((n) => n.kind === "ai_step").length;
  if (aiStepCount > LIMITS.MAX_AI_STEPS_PER_RUN) {
    yield {
      type: "run_error",
      error: `Workflow has ${aiStepCount} AI steps (limit: ${LIMITS.MAX_AI_STEPS_PER_RUN}).`,
    };
    return;
  }

  // ── Topological sort ────────────────────────────────────────────────────
  const order = topologicalSort(workflow);
  if (!order) {
    yield {
      type: "run_error",
      error: "Workflow contains a cycle — every workflow must be acyclic.",
    };
    return;
  }

  yield { type: "run_start", nodeIds: order };

  // Mark every node as queued up-front so the UI shows the whole pipeline
  // turning on at once — more satisfying than nodes lighting up out of order.
  for (const id of order) {
    yield { type: "node_status", nodeId: id, status: "queued" };
  }

  const nodeById = new Map(workflow.nodes.map((n) => [n.id, n]));
  const outputs = new Map<string, string>();

  // ── Iterate in topological order ────────────────────────────────────────
  for (const nodeId of order) {
    if (Date.now() - startedAt > wallBudget) {
      yield {
        type: "run_error",
        error: "Run exceeded the maximum wall-clock budget.",
      };
      return;
    }

    const node = nodeById.get(nodeId);
    if (!node) continue;

    yield { type: "node_status", nodeId, status: "running" };

    try {
      const predId = firstPredecessor(workflow, nodeId);
      const input = predId ? (outputs.get(predId) ?? "") : "";
      let output = "";

      switch (node.kind) {
        case "trigger":
          output = executeTrigger(node, triggerInput);
          break;

        case "ai_step": {
          const data = node.data as unknown as AIStepData;
          const expanded = expandTemplate(data.userPrompt, {
            input,
            trigger: triggerInput,
          });
          let accumulated = "";
          for await (const token of streamAIStep({
            model: data.model,
            systemPrompt: data.systemPrompt,
            userPrompt: expanded,
            temperature: data.temperature,
            maxTokens: clampMaxTokens(data.maxTokens),
          })) {
            accumulated += token;
            yield { type: "node_token", nodeId, token };
          }
          output = accumulated;
          break;
        }

        case "transform":
          output = executeTransform(node, input, triggerInput);
          break;

        case "output":
          output = executeOutput(node, input);
          break;
      }

      outputs.set(nodeId, output);
      yield { type: "node_output", nodeId, output };
      yield { type: "node_status", nodeId, status: "success" };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      yield { type: "node_status", nodeId, status: "error" };
      yield { type: "run_error", error: message, nodeId };
      return;
    }
  }

  yield { type: "run_complete" };
}
