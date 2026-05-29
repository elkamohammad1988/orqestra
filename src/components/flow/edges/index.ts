/**
 * Edge type registry.
 *
 * We override React Flow's built-in `"default"` so every existing edge
 * (and any new edge added via onConnect) picks up our custom renderer
 * without needing to set a `type` field. Same stability rule as
 * nodes/index.ts — module-scoped reference, never an inline literal.
 */

import type { EdgeTypes } from "reactflow";
import { FlowEdge } from "./flow-edge";

export const edgeTypes: EdgeTypes = {
  default: FlowEdge,
};
