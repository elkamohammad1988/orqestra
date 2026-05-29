/**
 * Cost & safety limits — the single source of truth.
 *
 * This file is the ONE PLACE to change anything safety- or cost-related.
 * Every runtime path (the Run route, the AI step executor, the rate limiter)
 * reads from here, so tweaking a number propagates instantly.
 *
 * ─── Why these specific numbers? ────────────────────────────────────────────
 *
 *  MAX_TOKENS_PER_AI_STEP (1024)
 *    Caps the worst-case cost of a single AI call. Haiku 4.5 is ~$1 per
 *    million output tokens, so a single capped step is ~$0.001. Even a
 *    runaway visitor spamming the demo can't ring up serious money.
 *
 *  MAX_AI_STEPS_PER_RUN (5)
 *    Bounds the total cost-per-run. 5 × 1024 tokens × $1/M = ~$0.005 max
 *    per run. Also bounds run *duration* — important because Vercel's free
 *    edge functions cap at 25–30s and we want every run to finish.
 *
 *  MAX_NODES_PER_WORKFLOW (50)
 *    Sanity guard on payload size to the run endpoint. The graph travels
 *    in the request body; a malicious payload of 100k nodes would
 *    otherwise be a denial-of-service vector.
 *
 *  MAX_RUN_WALL_MS (25_000)
 *    Self-imposed wall-clock budget. We stop iterating nodes once this
 *    elapses and emit a graceful `run_error` event, rather than letting
 *    Vercel kill the response mid-stream.
 *
 *  RATE_LIMIT_*
 *    A simple token-window: N runs per minute per IP/user. If this product
 *    sees serious traffic the in-memory map (lib/rate-limit.ts) should be
 *    swapped for Upstash Redis — that's a one-file change.
 */

import type { AIModel } from "./types";

export const LIMITS = {
  // ─── Per-AI-step ─────────────────────────────────────────────────────────
  /** Hard cap on Anthropic's `max_tokens` regardless of what the user set. */
  MAX_TOKENS_PER_AI_STEP: 1024,
  /** Cheapest current Claude — the demo default. Inspector lets users pick others. */
  DEFAULT_AI_MODEL: "claude-haiku-4-5-20251001" as const,

  // ─── Per-run ─────────────────────────────────────────────────────────────
  MAX_AI_STEPS_PER_RUN: 5,
  MAX_NODES_PER_WORKFLOW: 50,
  /**
   * Edges are bounded too — without a cap, a malicious client could send
   * a payload of 10M edges between 2 nodes, blow up JSON.parse, or stress
   * the topo-sort even though the node count was under its limit. 100 is
   * generous enough for any realistic graph at the node limit above.
   */
  MAX_EDGES_PER_WORKFLOW: 100,
  MAX_RUN_WALL_MS: 25_000,

  // ─── Rate limit ──────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_PER_WINDOW: 8,
} as const;

/**
 * Maps the user-facing model option to the actual Anthropic API model ID.
 * Adding a new model: extend the AIModel union in types.ts, then add an
 * entry here. The model dropdown in the inspector auto-picks it up.
 */
export const MODEL_ID_MAP: Record<AIModel, string> = {
  "claude-3-5-sonnet": "claude-sonnet-4-6",
  "claude-3-5-haiku": "claude-haiku-4-5-20251001",
  "claude-3-opus": "claude-opus-4-7",
};

/**
 * Sanitize an AI step's max_tokens config — never trust the value coming
 * over the wire. Called inside the executor before the Anthropic call.
 */
export function clampMaxTokens(requested: number): number {
  if (!Number.isFinite(requested) || requested <= 0) return 256;
  return Math.min(Math.floor(requested), LIMITS.MAX_TOKENS_PER_AI_STEP);
}
