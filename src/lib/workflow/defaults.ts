/**
 * Per-kind defaults for new nodes.
 *
 * Called from the node library when the user drops a fresh node onto the
 * canvas. Centralizing defaults here keeps "what does a new AI step look
 * like out of the box" in exactly one place — change it once, every new
 * node picks it up.
 */

import type { WorkflowNodeKind } from "@/types";
import type {
  WorkflowNodeData,
  TriggerData,
  AIStepData,
  TransformData,
  OutputData,
} from "./types";

const triggerDefault: TriggerData = {
  label: "Trigger",
  source: "manual",
  config: "",
};

const aiStepDefault: AIStepData = {
  label: "AI Step",
  model: "claude-3-5-sonnet",
  systemPrompt:
    "You are a helpful assistant. Respond concisely with the requested output.",
  userPrompt: "{{ input }}",
  temperature: 0.2,
  maxTokens: 512,
};

const transformDefault: TransformData = {
  label: "Transform",
  operation: "template",
  expression: "{{ result.text }}",
};

const outputDefault: OutputData = {
  label: "Output",
  destination: "console",
  target: "",
};

export function defaultDataForKind(kind: WorkflowNodeKind): WorkflowNodeData {
  switch (kind) {
    case "trigger":
      return { kind, ...triggerDefault };
    case "ai_step":
      return { kind, ...aiStepDefault };
    case "transform":
      return { kind, ...transformDefault };
    case "output":
      return { kind, ...outputDefault };
  }
}

// Display metadata for the node library and inspector. Single source of
// truth so labels/colors/blurbs never drift between views.
export const NODE_KIND_META: Record<
  WorkflowNodeKind,
  { label: string; blurb: string }
> = {
  trigger: {
    label: "Trigger",
    blurb: "Start the workflow on an event",
  },
  ai_step: {
    label: "AI Step",
    blurb: "Call a language model with a prompt",
  },
  transform: {
    label: "Transform",
    blurb: "Reshape data between steps",
  },
  output: {
    label: "Output",
    blurb: "Send the result somewhere",
  },
};
