/**
 * Node type registry.
 *
 * React Flow looks up a custom renderer by `node.type` against this map.
 * Adding a new kind is a three-line change here plus a renderer file —
 * see types/index.ts header for the full 4-step recipe.
 *
 * The registry is exported as a STABLE REFERENCE — defined at module load,
 * never re-created. If we passed an inline `{ trigger: TriggerNode, … }`
 * literal to ReactFlow, every render would create a new object and React
 * Flow would think the registry changed, blowing away rendered node state.
 */

import type { NodeTypes } from "reactflow";
import { TriggerNode } from "./trigger-node";
import { AIStepNode } from "./ai-step-node";
import { TransformNode } from "./transform-node";
import { OutputNode } from "./output-node";

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  ai_step: AIStepNode,
  transform: TransformNode,
  output: OutputNode,
};
