"use client";

/**
 * Inspector — the right sidebar.
 *
 * Two modes:
 *  - NO SELECTION → workflow metadata + at-a-glance stats.
 *  - NODE SELECTED → kind-specific config form with a per-kind accent
 *    treatment in the header so the user always knows what they're editing.
 *
 * Every form field dispatches `updateNodeData(id, patch)`, which updates
 * the store, which re-renders the canvas. Unidirectional. The store also
 * flips `saveStatus` to "dirty" on every patch, which the topbar reads.
 */

import * as React from "react";
import {
  Trash2,
  Sparkles,
  Zap,
  Wand2,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkflowStore } from "@/lib/workflow/store";
import { cn } from "@/lib/utils";
import type { WorkflowNodeKind } from "@/types";
import type {
  AIStepData,
  AIModel,
  OutputData,
  OutputDestination,
  TransformData,
  TransformOperation,
  TriggerData,
  TriggerSource,
} from "@/lib/workflow/types";

export function Inspector() {
  // Each slice is subscribed independently. Zustand re-renders this
  // component only when the value of the selector changes.
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const node = useWorkflowStore((s) =>
    s.nodes.find((n) => n.id === selectedNodeId),
  );
  const removeNode = useWorkflowStore((s) => s.removeNode);

  return (
    <aside className="hidden h-full w-[300px] shrink-0 flex-col border-l border-border bg-card/40 lg:flex xl:w-[320px]">
      {/* Header — gets a thin accent stripe matching the selected node kind */}
      <div className="relative border-b border-border">
        {node && (
          <div
            aria-hidden
            className={cn(
              "absolute inset-x-0 top-0 h-px",
              kindAccentLine(node.type as WorkflowNodeKind),
            )}
          />
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {node ? "Node configuration" : "Workflow"}
          </h2>
          {node && (
            <button
              type="button"
              onClick={() => removeNode(node.id)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete node"
              title="Delete node (Backspace)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {node ? <NodeInspector node={node} /> : <WorkflowInspector />}
      </div>

      {/* Footer — keyboard hints, always visible */}
      <div className="border-t border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[9px]">
              ⌫
            </kbd>
            delete
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[9px]">
              ?
            </kbd>
            shortcuts
          </span>
        </div>
      </div>
    </aside>
  );
}

function kindAccentLine(kind: WorkflowNodeKind | undefined): string {
  switch (kind) {
    case "trigger":
      return "bg-amber-500/60";
    case "ai_step":
      return "bg-brand-500/70";
    case "transform":
      return "bg-sky-500/60";
    case "output":
      return "bg-emerald-500/60";
    default:
      return "bg-border";
  }
}

// ─── Workflow-level inspector (no selection) ────────────────────────────────

function WorkflowInspector() {
  const name = useWorkflowStore((s) => s.name);
  const description = useWorkflowStore((s) => s.description);
  const setName = useWorkflowStore((s) => s.setName);
  const setDescription = useWorkflowStore((s) => s.setDescription);
  const nodeCount = useWorkflowStore((s) => s.nodes.length);
  const edgeCount = useWorkflowStore((s) => s.edges.length);
  const aiStepCount = useWorkflowStore(
    (s) => s.nodes.filter((n) => n.type === "ai_step").length,
  );

  return (
    <div className="space-y-5">
      <Field label="Name">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My workflow"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40"
          placeholder="What does this workflow do?"
        />
      </Field>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/30 p-3">
        <Metric label="Nodes" value={nodeCount.toString()} />
        <Metric label="Edges" value={edgeCount.toString()} />
        <Metric label="AI" value={aiStepCount.toString()} />
      </div>
      <div className="rounded-md border border-dashed border-border bg-background/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Select a node on the canvas to edit its configuration. Drag from the
        left rail to add a new one.
      </div>
    </div>
  );
}

// ─── Node inspector (something selected) ────────────────────────────────────

function NodeInspector({
  node,
}: {
  node: ReturnType<typeof useWorkflowStore.getState>["nodes"][number];
}) {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const data = node.data as
    | TriggerData
    | AIStepData
    | TransformData
    | OutputData;

  const Header = () => {
    const Icon =
      node.type === "trigger"
        ? Zap
        : node.type === "ai_step"
          ? Sparkles
          : node.type === "transform"
            ? Wand2
            : Send;
    return (
      <div className="mb-5 flex items-center gap-2.5 overflow-hidden rounded-lg border border-border bg-background p-3 shadow-elevation-1">
        <div
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md transition-colors",
            node.type === "ai_step"
              ? "bg-foreground text-background"
              : "border border-border bg-card text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-foreground">
            {data.label}
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span>{node.type}</span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate">{node.id.slice(0, 18)}…</span>
          </div>
        </div>
      </div>
    );
  };

  // Render the kind-specific form. The `as` casts here are safe because
  // we just narrowed by `node.type`.
  return (
    <div>
      <Header />
      <div className="space-y-5">
        <Field label="Label">
          <Input
            value={data.label}
            onChange={(e) =>
              updateNodeData(node.id, {
                label: e.target.value,
              } as Partial<typeof data>)
            }
          />
        </Field>

        {node.type === "trigger" && (
          <TriggerForm
            data={data as TriggerData}
            onPatch={(patch) => updateNodeData(node.id, patch)}
          />
        )}
        {node.type === "ai_step" && (
          <AIStepForm
            data={data as AIStepData}
            onPatch={(patch) => updateNodeData(node.id, patch)}
          />
        )}
        {node.type === "transform" && (
          <TransformForm
            data={data as TransformData}
            onPatch={(patch) => updateNodeData(node.id, patch)}
          />
        )}
        {node.type === "output" && (
          <OutputForm
            data={data as OutputData}
            onPatch={(patch) => updateNodeData(node.id, patch)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Kind-specific forms ────────────────────────────────────────────────────

function TriggerForm({
  data,
  onPatch,
}: {
  data: TriggerData;
  onPatch: (p: Partial<TriggerData>) => void;
}) {
  const sources: TriggerSource[] = ["manual", "webhook", "schedule"];
  return (
    <>
      <Field label="Source">
        <SegmentedControl
          value={data.source}
          options={sources}
          onChange={(v) => onPatch({ source: v as TriggerSource })}
        />
      </Field>
      {data.source === "schedule" && (
        <Field label="Cron schedule">
          <Input
            value={data.config}
            onChange={(e) => onPatch({ config: e.target.value })}
            placeholder="0 9 * * 1-5"
          />
        </Field>
      )}
      {data.source === "webhook" && <WebhookEndpointPanel />}
    </>
  );
}

/**
 * Renders the live POST endpoint a saved workflow exposes when a trigger
 * is set to `webhook`. Reads workflowId + webhookToken from the store;
 * if the workflow hasn't been saved yet, shows a hint instead.
 */
function WebhookEndpointPanel() {
  const workflowId = useWorkflowStore((s) => s.workflowId);
  const webhookToken = useWorkflowStore((s) => s.webhookToken);

  if (!workflowId || !webhookToken) {
    return (
      <div className="rounded-md border border-dashed border-border bg-background/40 p-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Save the workflow to generate its webhook URL.
      </div>
    );
  }

  // Resolve the app origin on the client so devs see the right URL whether
  // they're on localhost, a Vercel preview, or production.
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}/api/webhooks/${workflowId}?token=${webhookToken}`;
  const curl = [
    `curl -X POST '${url}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '{"input":"hello"}'`,
  ].join("\n");

  return (
    <div className="space-y-3">
      <Field label="POST endpoint">
        <CopyableField value={url} kind="url" />
      </Field>
      <Field label="Sample request">
        <CopyableField value={curl} kind="curl" />
      </Field>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        The endpoint accepts a JSON body. Either pass{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">
          {`{"input":"…"}`}
        </code>{" "}
        to set the trigger input, or send any JSON / text body — it&apos;ll
        arrive as the trigger value.
      </p>
    </div>
  );
}

function CopyableField({
  value,
  kind,
}: {
  value: string;
  kind: "url" | "curl";
}) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // Permissions denied or insecure context — no-op. The user can still
      // select the text manually since the textarea isn't readonly-hidden.
    }
  }

  return (
    <div className="relative">
      <textarea
        readOnly
        value={value}
        rows={kind === "url" ? 2 : 3}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 pr-9 font-mono text-[11px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      <button
        type="button"
        onClick={copy}
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Copy"
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function AIStepForm({
  data,
  onPatch,
}: {
  data: AIStepData;
  onPatch: (p: Partial<AIStepData>) => void;
}) {
  const models: AIModel[] = [
    "claude-3-5-sonnet",
    "claude-3-5-haiku",
    "claude-3-opus",
  ];
  return (
    <>
      <Field label="Model">
        <SelectMenu
          value={data.model}
          options={models}
          onChange={(v) => onPatch({ model: v as AIModel })}
        />
      </Field>
      <Field label="System prompt">
        <textarea
          value={data.systemPrompt}
          onChange={(e) => onPatch({ systemPrompt: e.target.value })}
          rows={4}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </Field>
      <Field label="User prompt">
        <textarea
          value={data.userPrompt}
          onChange={(e) => onPatch({ userPrompt: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Temperature">
          <Input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={data.temperature}
            onChange={(e) =>
              onPatch({ temperature: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Max tokens">
          <Input
            type="number"
            min={1}
            max={4096}
            step={1}
            value={data.maxTokens}
            onChange={(e) => onPatch({ maxTokens: Number(e.target.value) })}
          />
        </Field>
      </div>
    </>
  );
}

function TransformForm({
  data,
  onPatch,
}: {
  data: TransformData;
  onPatch: (p: Partial<TransformData>) => void;
}) {
  const ops: TransformOperation[] = ["extract_json", "template", "filter"];
  return (
    <>
      <Field label="Operation">
        <SegmentedControl
          value={data.operation}
          options={ops}
          onChange={(v) => onPatch({ operation: v as TransformOperation })}
        />
      </Field>
      <Field label="Expression">
        <textarea
          value={data.expression}
          onChange={(e) => onPatch({ expression: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-[12px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
          placeholder={
            data.operation === "extract_json"
              ? "$.results[*].text"
              : data.operation === "template"
                ? "{{ result.text }}"
                : "result.score > 0.7"
          }
        />
      </Field>
    </>
  );
}

function OutputForm({
  data,
  onPatch,
}: {
  data: OutputData;
  onPatch: (p: Partial<OutputData>) => void;
}) {
  const dests: OutputDestination[] = ["console", "webhook", "slack", "email"];
  return (
    <>
      <Field label="Destination">
        <SelectMenu
          value={data.destination}
          options={dests}
          onChange={(v) => onPatch({ destination: v as OutputDestination })}
        />
      </Field>
      {data.destination !== "console" && (
        <Field
          label={
            data.destination === "webhook"
              ? "URL"
              : data.destination === "slack"
                ? "Channel"
                : "Address"
          }
        >
          <Input
            value={data.target}
            onChange={(e) => onPatch({ target: e.target.value })}
            placeholder={
              data.destination === "webhook"
                ? "https://api.example.com/hook"
                : data.destination === "slack"
                  ? "#alerts"
                  : "team@example.com"
            }
          />
        </Field>
      )}
    </>
  );
}

// ─── Tiny UI helpers ────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-semibold tracking-tight text-foreground nums">
        {value}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors ${
            value === opt
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SelectMenu<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
