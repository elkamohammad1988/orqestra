/**
 * Workflow domain types — the shape of a workflow as it lives on disk
 * and in the editor store.
 *
 * Two design notes worth understanding:
 *
 *  1. EACH NODE KIND HAS ITS OWN `data` SHAPE.
 *     A trigger and an AI step need wildly different configuration. Using a
 *     discriminated union (`type WorkflowNodeData = TriggerData | AIStepData
 *     | ...`) means TypeScript narrows the data based on `kind` — you can't
 *     accidentally read `model` off a trigger node.
 *
 *  2. STATUS IS DERIVED, NOT STORED.
 *     A node's execution status (queued/running/success/error) is *runtime*
 *     state, not part of the saved workflow. We pass it into the rendered
 *     node as a separate prop during a run — never persist it to the DB.
 *     Same for `output`. This keeps the workflow document clean and the
 *     run history a separate, append-only artifact (Phase 3).
 */

import type { WorkflowNodeKind } from "@/types";

// ─── Per-kind config shapes ────────────────────────────────────────────────

export type TriggerSource = "manual" | "webhook" | "schedule";

export interface TriggerData {
  label: string;
  source: TriggerSource;
  /** For schedule triggers, a cron string. For webhook, the path. */
  config: string;
}

export type AIModel =
  | "claude-3-5-sonnet"
  | "claude-3-5-haiku"
  | "claude-3-opus";

export interface AIStepData {
  label: string;
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

export type TransformOperation = "extract_json" | "template" | "filter";

export interface TransformData {
  label: string;
  // NOTE: this is intentionally NOT named `kind` — that name is reserved
  // for the WorkflowNodeKind discriminator on the parent union.
  operation: TransformOperation;
  /** A jq-like path, a handlebars template, or a JS expression — operation-dependent. */
  expression: string;
}

export type OutputDestination = "console" | "webhook" | "slack" | "email";

export interface OutputData {
  label: string;
  destination: OutputDestination;
  /** URL for webhook, channel for slack, address for email. */
  target: string;
}

// ─── Runtime status (not persisted) ────────────────────────────────────────

export type NodeStatus = "idle" | "queued" | "running" | "success" | "error";

// ─── Discriminated union ───────────────────────────────────────────────────
//
// This is the type you'd write when handling node data generically:
//
//   function summary(node: WorkflowNodeData) {
//     if (node.kind === "ai_step") {
//       return `Calls ${node.model}`;        // ← `model` is type-safe here
//     }
//     if (node.kind === "trigger") {
//       return `Triggered by ${node.source}`; // ← `source` only on triggers
//     }
//   }
//
export type WorkflowNodeData =
  | ({ kind: "trigger" } & TriggerData)
  | ({ kind: "ai_step" } & AIStepData)
  | ({ kind: "transform" } & TransformData)
  | ({ kind: "output" } & OutputData);

// Convenience: pick the data for a single kind without the discriminator.
export type DataForKind<K extends WorkflowNodeKind> = Extract<
  WorkflowNodeData,
  { kind: K }
>;
