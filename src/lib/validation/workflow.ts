/**
 * Runtime validation for workflow payloads.
 *
 * Every entry point that accepts a workflow over the wire — the SSE run
 * route, the save action, and (transitively) the webhook route — passes
 * through these schemas. The point is twofold:
 *
 *   1. Type safety at the boundary. TypeScript erases at runtime, so any
 *      `as Workflow` cast is fiction until we verify the shape.
 *
 *   2. Resource caps. The hard limits live in `lib/workflow/limits.ts`
 *      and are echoed here so a 10MB blob of nodes never reaches the
 *      orchestrator's hot path.
 *
 * Schemas mirror — but don't import — the domain types in src/types so
 * Zod stays the source of truth at the network boundary. The cast at the
 * usage site (`schema.parse(body) as Workflow`) is the only place where
 * the two type systems meet.
 */

import { z } from "zod";
import { LIMITS } from "@/lib/workflow/limits";

const FiniteNumber = z
  .number()
  .refine(Number.isFinite, "Must be a finite number");

const WorkflowNodeKindSchema = z.enum([
  "trigger",
  "ai_step",
  "transform",
  "output",
]);

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1).max(128),
  kind: WorkflowNodeKindSchema,
  position: z.object({
    x: FiniteNumber,
    y: FiniteNumber,
  }),
  // Per-kind data shapes are validated by the executor itself — there's
  // little value in re-deriving the discriminated union here. We just
  // accept an object and cap its serialized size implicitly via the
  // overall payload limit at the route handler.
  data: z.record(z.string(), z.unknown()),
});

export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1).max(128),
  source: z.string().min(1).max(128),
  target: z.string().min(1).max(128),
});

/**
 * The shape the run route accepts. `id` is optional because anonymous
 * demo runs may send an ephemeral payload not yet persisted.
 */
export const WorkflowBodySchema = z.object({
  id: z.string().max(128).optional(),
  user_id: z.string().max(128).optional(),
  name: z.string().max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  nodes: z.array(WorkflowNodeSchema).max(LIMITS.MAX_NODES_PER_WORKFLOW, {
    message: `Workflow exceeds the ${LIMITS.MAX_NODES_PER_WORKFLOW}-node limit.`,
  }),
  edges: z.array(WorkflowEdgeSchema).max(LIMITS.MAX_EDGES_PER_WORKFLOW, {
    message: `Workflow exceeds the ${LIMITS.MAX_EDGES_PER_WORKFLOW}-edge limit.`,
  }),
  webhook_token: z.string().max(128).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const RunRequestBodySchema = z.object({
  workflow: WorkflowBodySchema,
  triggerInput: z.string().max(64 * 1024).optional(),
});

/**
 * Shape accepted by `saveWorkflowAction`. Stricter than the run body —
 * a save MUST have a non-empty name, and we never let the client send
 * its own `user_id` (the server derives it from the session).
 */
export const SaveWorkflowInputSchema = z.object({
  id: z.string().max(128).optional(),
  name: z
    .string()
    .trim()
    .min(1, "Please name your workflow.")
    .max(200, "Workflow name is too long."),
  description: z.string().max(2000).nullable().optional(),
  nodes: z.array(WorkflowNodeSchema).max(LIMITS.MAX_NODES_PER_WORKFLOW, {
    message: `Workflow exceeds the ${LIMITS.MAX_NODES_PER_WORKFLOW}-node limit.`,
  }),
  edges: z.array(WorkflowEdgeSchema).max(LIMITS.MAX_EDGES_PER_WORKFLOW, {
    message: `Workflow exceeds the ${LIMITS.MAX_EDGES_PER_WORKFLOW}-edge limit.`,
  }),
});
