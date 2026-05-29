/**
 * Demo workflow rendered into the editor when:
 *   • A signed-out visitor opens /workflows/demo (the landing CTA)
 *   • Local dev runs without Supabase keys (fallback fixture)
 *
 * Layout is intentionally on a tight grid (x: 40 / 380 / 720, y centered
 * around 200) so the graph reads as composed rather than scattered — this
 * is the workflow that anchors every screenshot and Loom demo, so the
 * spatial first impression matters as much as the data.
 *
 * Shape mirrors what Supabase returns; swap is a single import change.
 */

import type { Workflow } from "@/types";

export const demoWorkflow: Workflow = {
  id: "wf_demo",
  user_id: "demo-user",
  name: "Customer Feedback Router",
  description:
    "Listens for inbound Slack feedback, classifies it with Claude, then routes structured tickets into Linear — fully observable in run history.",
  nodes: [
    {
      id: "n_trigger",
      kind: "trigger",
      position: { x: 40, y: 200 },
      data: {
        kind: "trigger",
        label: "New feedback",
        source: "webhook",
        config: "/slack/feedback",
      } as unknown as Record<string, unknown>,
    },
    {
      id: "n_classify",
      kind: "ai_step",
      position: { x: 380, y: 200 },
      data: {
        kind: "ai_step",
        label: "Classify intent",
        model: "claude-3-5-sonnet",
        systemPrompt:
          "You are a customer support classifier. For each inbound message, respond with JSON containing: category (bug | feature | billing | other), priority (low | medium | high), and a one-sentence summary.",
        userPrompt: "{{ trigger.text }}",
        temperature: 0.2,
        maxTokens: 256,
      } as unknown as Record<string, unknown>,
    },
    {
      id: "n_extract",
      kind: "transform",
      position: { x: 720, y: 80 },
      data: {
        kind: "transform",
        label: "Extract priority",
        operation: "extract_json",
        expression: "$.priority",
      } as unknown as Record<string, unknown>,
    },
    {
      id: "n_route",
      kind: "output",
      position: { x: 720, y: 320 },
      data: {
        kind: "output",
        label: "Create Linear ticket",
        destination: "webhook",
        target: "https://api.linear.app/v1/issues",
      } as unknown as Record<string, unknown>,
    },
  ],
  edges: [
    { id: "e_t_c", source: "n_trigger", target: "n_classify" },
    { id: "e_c_e", source: "n_classify", target: "n_extract" },
    { id: "e_c_r", source: "n_classify", target: "n_route" },
  ],
  webhook_token: "demo-token",
  created_at: "2026-05-20T12:00:00Z",
  updated_at: "2026-05-26T10:30:00Z",
};

/**
 * Default trigger input the editor uses when the user hits Run without
 * having configured one. Pulled out into a named export so the demo
 * workflow + the editor topbar can share the same realistic example.
 */
export const DEMO_TRIGGER_INPUT =
  "We just got this in #feedback: “Files over 10MB fail to upload from the dashboard — repro 100% on Firefox.” Treat it as a customer-reported bug.";
