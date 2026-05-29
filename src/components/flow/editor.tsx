"use client";

/**
 * Editor — the central component that wires React Flow to our store.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DATA FLOW IN ONE PICTURE
 * ─────────────────────────────────────────────────────────────────────────
 *
 *           ┌──────────────────────┐
 *           │  Zustand store       │  (single source of truth)
 *           │  nodes / edges /     │
 *           │  selected / runStatus│
 *           └──────────┬───────────┘
 *                      │  reads via useWorkflowStore(selector)
 *                      ▼
 *  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐
 *  │  Topbar    │  │  NodeLibrary │  │  ReactFlow   │  │  Inspector │
 *  │  (name,    │  │  (drag src)  │  │  (canvas)    │  │  (forms)   │
 *  │   save,    │  │              │  │              │  │            │
 *  │   run)     │  │              │  │              │  │            │
 *  └─────┬──────┘  └───────┬──────┘  └───────┬──────┘  └─────┬──────┘
 *        │ dispatches      │ drops            │ change events │ patches
 *        ▼                 ▼                  ▼               ▼
 *           ┌──────────────────────┐
 *           │   store actions      │
 *           │  (onNodesChange,     │
 *           │   addNode, …)        │
 *           └──────────────────────┘
 *
 *  Every component reads the slice it needs and only re-renders on changes
 *  to that slice. Nothing is prop-drilled. The drag-drop handler below is
 *  the *only* place the editor needs to know about pixel coordinates —
 *  everything else is pure data.
 * ─────────────────────────────────────────────────────────────────────────
 */

import * as React from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  ConnectionLineType,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "reactflow";
// React Flow's stylesheet — registers the default classes for handles,
// edges, controls, etc. We override much of it via globals.css (the
// .react-flow__* selectors).
import "reactflow/dist/style.css";

import { useWorkflowStore } from "@/lib/workflow/store";
import { nodeTypes } from "@/components/flow/nodes";
import { edgeTypes } from "@/components/flow/edges";
import { NodeLibrary } from "@/components/flow/node-library";
import { Inspector } from "@/components/flow/inspector";
import { EditorTopbar } from "@/components/flow/editor-topbar";
import { StatusBar } from "@/components/flow/status-bar";
import { EmptyCanvas } from "@/components/flow/empty-canvas";
import { RunConsole } from "@/components/flow/run-console";
import { ShortcutsOverlay } from "@/components/flow/shortcuts-overlay";
import type { Workflow } from "@/types";
import type { WorkflowNodeKind } from "@/types";

interface EditorProps {
  /** Optional initial workflow. Pass `null` for a blank canvas (/workflows/new). */
  initialWorkflow: Workflow | null;
  /** True for the public demo path — hides Save, locks the name. */
  readOnly?: boolean;
  /**
   * When true, treat `initialWorkflow` as a starting template — the editor
   * resets its persisted id/token so the first Save creates a new row, and
   * the state opens as "Unsaved" so the user knows what to do next.
   */
  fromTemplate?: boolean;
}

/**
 * Exported wrapper. ReactFlowProvider must wrap ANY component that calls
 * `useReactFlow()` — including the drop handler in <Canvas>. Putting the
 * provider at this level lets siblings (Inspector, Topbar) call the hook
 * too if they ever need to.
 */
export function Editor(props: EditorProps) {
  return (
    <ReactFlowProvider>
      <EditorChrome {...props} />
    </ReactFlowProvider>
  );
}

// ─── Chrome (sidebars + canvas) ─────────────────────────────────────────────

function EditorChrome({
  initialWorkflow,
  readOnly = false,
  fromTemplate = false,
}: EditorProps) {
  const loadWorkflow = useWorkflowStore((s) => s.loadWorkflow);
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);
  const loadEmpty = useWorkflowStore((s) => s.loadEmpty);

  // Hydrate the store on mount. The store is module-scoped (a Zustand
  // instance lives for the lifetime of the page), so we have to reset it
  // explicitly when navigating to a different workflow.
  React.useEffect(() => {
    if (initialWorkflow && fromTemplate) {
      loadTemplate(initialWorkflow);
    } else if (initialWorkflow) {
      loadWorkflow(initialWorkflow);
    } else {
      loadEmpty();
    }
  }, [initialWorkflow, fromTemplate, loadWorkflow, loadTemplate, loadEmpty]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <EditorTopbar readOnly={readOnly} />
      <div className="flex min-h-0 flex-1">
        <NodeLibrary />
        <Canvas />
        <Inspector />
      </div>
      <RunConsole />
      <StatusBar />
      {/* Modal — listens for `?` / Esc globally and renders only when open. */}
      <ShortcutsOverlay />
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────────────

function Canvas() {
  const reactFlow = useReactFlow();
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // While the cursor is over the canvas mid-drag, we paint a soft drop hint.
  // Pure visual affordance — doesn't gate the drop.
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Slice subscriptions — each is independent so we only re-render on
  // changes we care about.
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const addNode = useWorkflowStore((s) => s.addNode);

  /**
   * onDragOver MUST call `preventDefault()` — without it the browser
   * rejects the subsequent drop. This is a quirk of the HTML5 drag API,
   * not something React Flow controls.
   */
  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);
  const onDragLeave = React.useCallback(() => setIsDragOver(false), []);

  /**
   * Drop handler. The library item set `application/orqestra-node` on
   * dragstart; we read it here, convert the cursor's *screen* position
   * to *flow* coordinates (the canvas pans/zooms — screen px ≠ flow px),
   * and dispatch addNode.
   */
  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);
      const kind = event.dataTransfer.getData(
        "application/orqestra-node",
      ) as WorkflowNodeKind;
      if (!kind) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(kind, position);
    },
    [reactFlow, addNode],
  );

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // React Flow calls these with a list of *intended* changes; we
        // hand them to the store's helpers (applyNodeChanges etc.) which
        // return the next state. See store.ts header for the full pattern.
        onNodesChange={onNodesChange as (changes: NodeChange[]) => void}
        onEdgesChange={onEdgesChange as (changes: EdgeChange[]) => void}
        onConnect={onConnect as (connection: Connection) => void}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        // Clicking a node sets the store's selectedNodeId so the Inspector
        // can react. Clicking empty space (pane) deselects.
        onNodeClick={(_, node) => selectNode(node.id)}
        onPaneClick={() => selectNode(null)}
        // Keyboard delete: Backspace/Delete with a node selected.
        deleteKeyCode={["Backspace", "Delete"]}
        // Fit on mount so users always see their whole graph. Tighter
        // padding (0.18) makes the workflow feel present in the canvas
        // instead of floating in too much negative space — better for
        // Loom recordings and screenshot composition. maxZoom=1 still
        // caps natural node size on wide displays.
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        // Smooth, easing pan/zoom feels far more premium than the default.
        panOnScroll
        selectionOnDrag
        // 10px snap makes positioning feel intentional — nodes lock to a
        // rhythm without the snap being so coarse it fights the user.
        snapToGrid
        snapGrid={[10, 10]}
        // The line painted between handles while dragging — styled via
        // .react-flow__connection-path in globals.css.
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.1}
          color="hsl(var(--border))"
        />
        <Controls showInteractive={false} />
        {/*
         * MiniMap intentionally omitted. For the workflow sizes Orqestra
         * supports today (≤25 nodes on Pro), it adds visual noise without
         * meaningful navigation value, and it competes for attention with
         * the canvas in screenshots and Loom demos. Re-add when we ship
         * sprawling graphs that no longer fit a fitView.
         */}
      </ReactFlow>

      {/* Drop-zone affordance: a soft glow + dashed outline appears when
          dragging a library item over the canvas. Strictly visual. */}
      {isDragOver && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed border-brand-500/40 bg-brand-500/[0.03]"
        />
      )}

      {nodes.length === 0 && <EmptyCanvas active={isDragOver} />}
    </div>
  );
}
