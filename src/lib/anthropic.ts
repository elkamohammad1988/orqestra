/**
 * Anthropic client wrapper — server-only.
 *
 * The ANTHROPIC_API_KEY is a long-lived secret that bills directly to our
 * account. It MUST NEVER reach the browser bundle. The only thing that
 * ever touches `process.env.ANTHROPIC_API_KEY` is server code: the run
 * route handler (Edge runtime) and this file, which it imports.
 *
 * Why a wrapper at all instead of using the SDK directly?
 *  - Centralizes the model-id lookup (MODEL_ID_MAP) and the max-tokens
 *    clamp (clampMaxTokens). Every AI call goes through here, so safety
 *    limits are impossible to forget.
 *  - Reduces the Anthropic SDK's API surface to a single generator that's
 *    easy to test and easy to swap for a different provider later with no
 *    callsite changes.
 */

import Anthropic from "@anthropic-ai/sdk";
import { LIMITS, MODEL_ID_MAP, clampMaxTokens } from "./workflow/limits";
import type { AIModel } from "./workflow/types";

let _client: Anthropic | null = null;

/**
 * Lazy singleton so we don't construct the client at module load
 * (which would crash if the env var is missing during a static build).
 */
function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // User-facing message — surfaces verbatim in the run console.
    // The deployment hint stays in the server logs (see below) so it
    // reaches the operator without ever showing in the UI.
    console.warn(
      "[anthropic] ANTHROPIC_API_KEY missing — configure it in Vercel → Settings → Environment Variables.",
    );
    throw new Error(
      "The AI provider isn't configured on this deployment. Try again later or contact the workspace owner.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export interface AIStepInput {
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

/**
 * Streaming generator. Yields each text delta as it arrives from Anthropic.
 * Caller is responsible for accumulating tokens if it wants the full text.
 *
 * Usage:
 *   let full = "";
 *   for await (const token of streamAIStep(input)) {
 *     full += token;
 *     emit({ type: "node_token", nodeId, token });
 *   }
 */
export async function* streamAIStep(input: AIStepInput): AsyncGenerator<string> {
  const modelId =
    MODEL_ID_MAP[input.model] ?? MODEL_ID_MAP[LIMITS.DEFAULT_AI_MODEL as AIModel];

  const stream = client().messages.stream({
    model: modelId,
    max_tokens: clampMaxTokens(input.maxTokens),
    temperature: Math.min(Math.max(input.temperature, 0), 1),
    system: input.systemPrompt,
    messages: [{ role: "user", content: input.userPrompt }],
  });

  for await (const event of stream) {
    // Two delta shapes can carry text in the Messages API:
    //   - content_block_delta with delta.type === "text_delta"  (token-by-token)
    // We ignore everything else (message_start, content_block_start, etc.)
    // because none of those carry visible content.
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
