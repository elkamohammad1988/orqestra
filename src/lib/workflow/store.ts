/**
 * Workflow editor store (Zustand).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY ZUSTAND (and not Context / Redux / useState)?
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  React Flow's docs themselves recommend an external store for non-trivial
 *  editors, and the reasons map cleanly to our requirements:
 *
 *  - Cross-component selection. The CANVAS reports "user clicked node X",
 *    the INSPECTOR (a sibling, not a child) needs to react. Lifting state
 *    to a common ancestor would cause every parent to re-render on every
 *    drag tick. Zustand lets components *subscribe* only to the slice they
 *    care about — the inspector doesn't re-render when a node moves.
 *
 *  - High-frequency updates. Dragging fires ~60 onNodesChange events per
 *    second. With React Context, every consumer re-renders on every event.
 *    With Zustand, only `useStore(s => s.nodes)` consumers re-render, and
 *    components that read other slices (e.g. `selectedNodeId`) stay still.
 *
 *  - Imperative actions outside React. The save-on-Cmd+S handler needs to
 *    read the current state without subscribing. `useWorkflowStore.getState()`
 *    gives us that without prop-drilling or refs.
 *
 *  - Trivial serialization. The whole graph is one plain object — easy to
 *    snapshot (for save), restore (for load), or diff (for undo, Phase 3).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * HOW REACT FLOW INTERACTS WITH THE STORE
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  React Flow is *controlled*: we own `nodes` and `edges` and pass them in
 *  as props. When the user drags/connects/deletes, React Flow doesn't
 *  mutate our state — it calls our callbacks with a list of *changes*:
 *
 *      onNodesChange(changes: NodeChange[])
 *      onEdgesChange(changes: EdgeChange[])
 *      onConnect(connection: Connection)
 *
 *  We then call React Flow's `applyNodeChanges` / `applyEdgeChanges`
 *  helpers, which return the next nodes/edges arrays with those changes
 *  applied. We `set()` the result into the store, React re-renders, and
 *  React Flow gets the new props.
 *
 *  This pattern is why we never write `node.position = ...` directly —
 *  the canvas is read-only state for us, and React Flow's changes are
 *  the only legal way to mutate.
 */

"use client";

import { create } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "reactflow";
import type { WorkflowNodeKind } from "@/types";
import { defaultDataForKind } from "./defaults";
import type { NodeStatus, WorkflowNodeData } from "./types";
import {
  workflowToSnapshot,
  snapshotToWorkflow,
  type WorkflowSnapshot,
} from "./serialize";
import type { Workflow } from "@/types";

// ─── Save status — owned by the store, surfaced in the topbar ───────────────

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

// ─── Store shape ────────────────────────────────────────────────────────────

interface WorkflowState {
  // Workflow metadata (separate from React Flow data — see serialize.ts).
  workflowId: string | null;
  /**
   * Per-workflow token authenticating inbound webhook calls. `null` until
   * the workflow has been saved once (new workflows don't have a DB row
   * yet, so they don't have a token).
   */
  webhookToken: string | null;
  name: string;
  description: string | null;

  // Editor state — React Flow's shape.
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // ─── Runtime execution state ─────────────────────────────────────────────
  // All of these are CLEARED at the start of each run. They never persist.
  runStatus: Record<string, NodeStatus>;
  /** Accumulated streamed tokens per AI node, for live display in the node. */
  runTokens: Record<string, string>;
  /** Final output per node, captured when the orchestrator emits node_output. */
  runOutputs: Record<string, string>;
  /** Set to true while an SSE run is in-flight. Disables the Run button. */
  isRunning: boolean;
  /** Last run-level error, surfaced in the console. */
  runError: string | null;

  saveStatus: SaveStatus;
  /** Last successful save ISO time — surfaced in the topbar tooltip. */
  lastSavedAt: string | null;

  // ─── Editor UI affordances ───────────────────────────────────────────────
  // Kept here (instead of a second store) because they're scoped to the
  // same editor surface and benefit from the same selector-based subscribe
  // model — the topbar button, the status-bar button, and the global key
  // listener all read/write this same slot.
  shortcutsOpen: boolean;

  // ─── React-Flow-driven actions (called by the canvas) ────────────────────
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // ─── Editor actions (called by sidebars / toolbar / shortcuts) ───────────
  addNode: (kind: WorkflowNodeKind, position: XYPosition) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  updateNodeData: (id: string, patch: Partial<WorkflowNodeData>) => void;

  // ─── Metadata actions ────────────────────────────────────────────────────
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  markSaved: (workflowId?: string, webhookToken?: string) => void;

  // ─── UI affordance actions ───────────────────────────────────────────────
  setShortcutsOpen: (open: boolean) => void;

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  loadWorkflow: (workflow: Workflow) => void;
  /**
   * Seed the editor with someone else's workflow as a starting point.
   * Resets workflowId + webhookToken so the first save creates a new row
   * instead of trying to update the original, and marks the state dirty
   * so the user sees an "Unsaved" indicator immediately.
   */
  loadTemplate: (template: Workflow, displayName?: string) => void;
  loadEmpty: (name?: string) => void;
  toSnapshot: () => WorkflowSnapshot;
  toWorkflow: (userId: string) => Workflow;

  // ─── Execution actions (called by lib/workflow/run-client.ts) ────────────
  startRun: () => void;
  finishRun: (error?: string | null) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setQueuedAll: (nodeIds: string[]) => void;
  appendToken: (nodeId: string, token: string) => void;
  setNodeOutput: (nodeId: string, output: string) => void;
}

// ─── ID generator ───────────────────────────────────────────────────────────
//
// Short, sortable, collision-resistant. Good enough for client-side ids;
// when the DB takes over in Phase 3, server-generated UUIDs win, but the
// id format is opaque to React Flow so swapping is safe.
let _idCounter = 0;
function nextId(prefix = "n"): string {
  _idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${Date.now().toString(36)}_${_idCounter}_${rand}`;
}

// ─── The store ──────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: null,
  webhookToken: null,
  name: "Untitled workflow",
  description: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  runStatus: {},
  runTokens: {},
  runOutputs: {},
  isRunning: false,
  runError: null,
  saveStatus: "saved",
  lastSavedAt: null,
  shortcutsOpen: false,

  // React Flow → store ─────────────────────────────────────────────────────

  // `applyNodeChanges` is a pure helper from React Flow. It interprets the
  // `changes` array (position update, dimensions, select, remove, etc.) and
  // returns the next nodes array. We never hand-roll this logic — that's
  // the whole point of using the helper.
  onNodesChange: (changes) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      saveStatus: markDirty(changes, s.saveStatus),
    }));
  },

  onEdgesChange: (changes) => {
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      saveStatus: changes.some((c) => c.type === "remove")
        ? "dirty"
        : s.saveStatus,
    }));
  },

  // `onConnect` fires when the user drags from one handle to another. We
  // run it through `addEdge` (another React Flow helper) which dedupes
  // and assigns a stable id. We layer our own id on top so it survives a
  // round-trip through serialize/deserialize.
  onConnect: (connection) => {
    set((s) => ({
      edges: addEdge(
        { ...connection, id: nextId("e"), type: "default" },
        s.edges,
      ),
      saveStatus: "dirty",
    }));
  },

  // Editor → store ─────────────────────────────────────────────────────────

  addNode: (kind, position) => {
    const id = nextId(kind);
    const data = defaultDataForKind(kind);
    const newNode: Node<WorkflowNodeData> = {
      id,
      type: kind, // matches the key in components/flow/nodes/index.ts
      position,
      data,
    };
    set((s) => ({
      nodes: [...s.nodes, newNode],
      selectedNodeId: id,
      saveStatus: "dirty",
    }));
  },

  removeNode: (id) => {
    set((s) => ({
      // Drop the node AND any edges that referenced it. Forgetting the
      // edges step leaves dangling references — invisible bugs at run time.
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      saveStatus: "dirty",
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  // Partial update — caller passes only the fields that changed. We
  // shallow-merge into the existing data. For nested fields we'd need a
  // deeper merge, but our data shapes are flat by design (see types.ts).
  updateNodeData: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, ...patch } as WorkflowNodeData }
          : n,
      ),
      saveStatus: "dirty",
    }));
  },

  // Metadata ───────────────────────────────────────────────────────────────

  setName: (name) => set({ name, saveStatus: "dirty" }),

  setDescription: (description) =>
    set({ description: description.length === 0 ? null : description, saveStatus: "dirty" }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  markSaved: (workflowId, webhookToken) =>
    set((s) => ({
      saveStatus: "saved",
      lastSavedAt: new Date().toISOString(),
      workflowId: workflowId ?? s.workflowId,
      webhookToken: webhookToken ?? s.webhookToken,
    })),

  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  // Lifecycle ──────────────────────────────────────────────────────────────

  loadWorkflow: (workflow) => {
    const snapshot = workflowToSnapshot(workflow);
    set({
      workflowId: workflow.id,
      webhookToken: workflow.webhook_token ?? null,
      name: workflow.name,
      description: workflow.description,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      selectedNodeId: null,
      runStatus: {},
      runTokens: {},
      runOutputs: {},
      isRunning: false,
      runError: null,
      saveStatus: "saved",
      lastSavedAt: workflow.updated_at ?? null,
    });
  },

  loadTemplate: (template, displayName) => {
    const snapshot = workflowToSnapshot(template);
    set({
      // null id/token signal "this is unsaved" — first save inserts a new row.
      workflowId: null,
      webhookToken: null,
      name: displayName ?? template.name,
      description: template.description,
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      selectedNodeId: null,
      runStatus: {},
      runTokens: {},
      runOutputs: {},
      isRunning: false,
      runError: null,
      // Mark dirty so the user can see they have unsaved changes and the
      // Save button is the obvious next step.
      saveStatus: "dirty",
      lastSavedAt: null,
    });
  },

  loadEmpty: (name = "Untitled workflow") => {
    set({
      workflowId: null,
      webhookToken: null,
      name,
      description: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      runStatus: {},
      runTokens: {},
      runOutputs: {},
      isRunning: false,
      runError: null,
      saveStatus: "saved",
      lastSavedAt: null,
    });
  },

  toSnapshot: () => {
    const s = get();
    return {
      nodes: s.nodes,
      edges: s.edges,
      meta: {
        id: s.workflowId ?? nextId("wf"),
        name: s.name,
        description: s.description,
      },
    };
  },

  toWorkflow: (userId) => {
    const s = get();
    return snapshotToWorkflow(s.toSnapshot(), userId);
  },

  // Execution actions ──────────────────────────────────────────────────────
  //
  // These are the targets of the SSE event handler in run-client.ts. Each
  // is a tiny, focused mutation so the consumer reads like a switch on
  // event.type — no logic in the consumer, no events in the store.

  startRun: () =>
    set({
      isRunning: true,
      runStatus: {},
      runTokens: {},
      runOutputs: {},
      runError: null,
    }),

  finishRun: (error = null) => set({ isRunning: false, runError: error }),

  setNodeStatus: (nodeId, status) =>
    set((s) => ({
      runStatus: { ...s.runStatus, [nodeId]: status },
    })),

  setQueuedAll: (nodeIds) => {
    const next: Record<string, NodeStatus> = {};
    for (const id of nodeIds) next[id] = "queued";
    set({ runStatus: next });
  },

  appendToken: (nodeId, token) =>
    set((s) => ({
      runTokens: {
        ...s.runTokens,
        [nodeId]: (s.runTokens[nodeId] ?? "") + token,
      },
    })),

  setNodeOutput: (nodeId, output) =>
    set((s) => ({
      runOutputs: { ...s.runOutputs, [nodeId]: output },
    })),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Most node changes are positional drags during a single interaction. We
 * don't want to mark the workflow as "unsaved" for a pointer-move that's
 * just dimensions being measured by the canvas — only meaningful changes
 * dirty the state.
 */
function markDirty(changes: NodeChange[], current: SaveStatus): SaveStatus {
  const meaningful = changes.some(
    (c) =>
      c.type === "position" ||
      c.type === "remove" ||
      c.type === "add" ||
      c.type === "reset",
  );
  return meaningful ? "dirty" : current;
}
