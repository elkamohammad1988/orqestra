/**
 * Mock fixtures for the demo / empty-workspace path.
 *
 * The dashboard renders these only when Supabase isn't configured (local
 * preview, design tweaks, marketing screenshots). Once the user signs in
 * and saves their first workflow, the real data takes over and these
 * fixtures stop showing.
 *
 * Keep the shapes here in sync with the domain types in types/index.ts.
 */

export interface MockWorkflow {
  id: string;
  name: string;
  description: string;
  status: "healthy" | "running" | "failed" | "draft" | "paused";
  steps: number;
  runs: number;
  successRate: number;
  lastRunAt: string;
  updatedBy: { name: string; initials: string };
  runsSparkline: number[];
  tags: string[];
}

export interface MockRun {
  id: string;
  workflowName: string;
  workflowId: string;
  status: "success" | "running" | "failed" | "queued";
  startedAt: string;
  duration: string;
  tokens: number;
  trigger: "manual" | "schedule" | "webhook" | "api";
  /**
   * True when this mock id has a corresponding entry in `mockRunDetails`.
   * Lets the runs list link into /runs/[id] in demo mode (otherwise mocks
   * render as static rows since their ids aren't in any real DB).
   */
  hasDetail?: boolean;
}

export const mockWorkflows: MockWorkflow[] = [
  {
    id: "wf_01",
    name: "Customer Feedback Summarizer",
    description:
      "Ingests support tickets, summarizes themes with Claude, and posts a daily digest to Slack.",
    status: "healthy",
    steps: 6,
    runs: 1284,
    successRate: 99.4,
    lastRunAt: "2m ago",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [12, 18, 14, 22, 19, 28, 26, 30, 34, 32, 38, 42],
    tags: ["nlp", "slack"],
  },
  {
    id: "wf_02",
    name: "Lead Enrichment Pipeline",
    description:
      "Enriches new HubSpot leads with company data and routes to AE based on ICP score.",
    status: "running",
    steps: 8,
    runs: 892,
    successRate: 98.1,
    lastRunAt: "12s ago",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [8, 11, 10, 14, 18, 16, 20, 22, 19, 24, 28, 31],
    tags: ["sales", "hubspot"],
  },
  {
    id: "wf_03",
    name: "Support Ticket Router",
    description:
      "Classifies inbound tickets by urgency and intent, then routes to the right queue.",
    status: "healthy",
    steps: 5,
    runs: 3421,
    successRate: 99.8,
    lastRunAt: "11m ago",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [42, 38, 41, 44, 48, 46, 52, 49, 55, 58, 61, 64],
    tags: ["support", "classification"],
  },
  {
    id: "wf_04",
    name: "Content Moderation Flow",
    description:
      "Multi-step moderation chain for user-generated content with human-in-the-loop escalation.",
    status: "failed",
    steps: 7,
    runs: 156,
    successRate: 87.3,
    lastRunAt: "1h ago",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [15, 12, 18, 14, 11, 9, 7, 8, 6, 4, 6, 3],
    tags: ["safety", "vision"],
  },
  {
    id: "wf_05",
    name: "Email Auto-Reply Drafter",
    description:
      "Reads incoming email threads, drafts a contextual reply, queues for human review.",
    status: "healthy",
    steps: 4,
    runs: 412,
    successRate: 97.6,
    lastRunAt: "32m ago",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [4, 6, 8, 7, 10, 12, 14, 13, 16, 18, 17, 19],
    tags: ["email"],
  },
  {
    id: "wf_06",
    name: "Sales Call Notes",
    description:
      "Transcribes Zoom calls, extracts action items, syncs to Salesforce opportunities.",
    status: "draft",
    steps: 9,
    runs: 0,
    successRate: 0,
    lastRunAt: "—",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tags: ["sales", "transcription"],
  },
];

export const mockRecentRuns: MockRun[] = [
  {
    id: "run_a1b2",
    workflowName: "Lead Enrichment Pipeline",
    workflowId: "wf_02",
    status: "running",
    startedAt: "12s ago",
    duration: "—",
    tokens: 1842,
    trigger: "webhook",
  },
  {
    id: "run_c3d4",
    workflowName: "Customer Feedback Summarizer",
    workflowId: "wf_01",
    status: "success",
    startedAt: "2m ago",
    duration: "3.4s",
    tokens: 4218,
    trigger: "schedule",
    hasDetail: true,
  },
  {
    id: "run_e5f6",
    workflowName: "Support Ticket Router",
    workflowId: "wf_03",
    status: "success",
    startedAt: "11m ago",
    duration: "1.1s",
    tokens: 612,
    trigger: "webhook",
  },
  {
    id: "run_g7h8",
    workflowName: "Email Auto-Reply Drafter",
    workflowId: "wf_05",
    status: "success",
    startedAt: "32m ago",
    duration: "2.8s",
    tokens: 1956,
    trigger: "api",
  },
  {
    id: "run_i9j0",
    workflowName: "Content Moderation Flow",
    workflowId: "wf_04",
    status: "failed",
    startedAt: "1h ago",
    duration: "0.4s",
    tokens: 124,
    trigger: "manual",
  },
];

// Totals are derived from the per-workflow `runs` field above:
//   1284 + 892 + 3421 + 156 + 412 + 0 = 6,165
// Keeping these consistent so a data-savvy evaluator can audit the demo
// without spotting an arithmetic mismatch on the first hover.
export const mockMetrics = {
  totalRuns: { value: 6165, delta: 12.4, sparkline: [180, 210, 195, 240, 270, 260, 310, 340, 360, 410, 480, 520] },
  avgLatency: { value: "1.24s", delta: -8.2, sparkline: [1.6, 1.5, 1.55, 1.48, 1.4, 1.42, 1.36, 1.32, 1.3, 1.28, 1.26, 1.24] },
  successRate: { value: "99.2%", delta: 0.3, sparkline: [98.4, 98.6, 98.5, 98.8, 98.7, 99.0, 99.1, 99.0, 99.2, 99.1, 99.3, 99.2] },
  tokensUsed: { value: "4.21M", delta: 18.6, sparkline: [220, 250, 240, 280, 310, 305, 340, 380, 360, 405, 440, 480] },
};

// ─── Mock run detail (for /runs/[id] in unconfigured / portfolio mode) ──────
//
// Maps `run_c3d4` (the second item in mockRecentRuns) to a fully-formed
// WorkflowRun including a realistic event stream. /runs/[id] renders this
// when Supabase isn't configured AND the id matches a known mock — keeps
// the run-detail surface viewable in local dev + screenshot capture without
// needing a live Supabase row.

export interface MockRunDetail {
  id: string;
  workflow_id: string;
  workflow_name: string;
  user_id: string;
  status: "success" | "failed" | "running" | "canceled";
  trigger: "manual" | "schedule" | "webhook" | "api";
  trigger_input: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  token_count: number;
  error_message: string | null;
  events: Array<Record<string, unknown>>;
  created_at: string;
}

/** Realistic Claude classification output — used by the mock run detail's
 *  AI step events. Lifted to a constant so the streamed-token chunks and
 *  the final node_output stay consistent. */
const MOCK_AI_OUTPUT = `{
  "category": "bug",
  "priority": "high",
  "summary": "Dashboard file uploads fail above 10MB on Firefox — repro 100%."
}`;

function chunkTokens(text: string, chunkSize = 6): Array<{
  type: "node_token";
  nodeId: string;
  token: string;
}> {
  const out: Array<{ type: "node_token"; nodeId: string; token: string }> = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    out.push({
      type: "node_token",
      nodeId: "n_classify",
      token: text.slice(i, i + chunkSize),
    });
  }
  return out;
}

export const mockRunDetails: Record<string, MockRunDetail> = {
  run_c3d4: {
    id: "run_c3d4",
    workflow_id: "wf_01",
    workflow_name: "Customer Feedback Router",
    user_id: "demo-user",
    status: "success",
    trigger: "webhook",
    trigger_input:
      'We just got this in #feedback: "Files over 10MB fail to upload from the dashboard — repro 100% on Firefox." Treat it as a customer-reported bug.',
    started_at: "2026-05-27T15:42:00.000Z",
    finished_at: "2026-05-27T15:42:03.420Z",
    duration_ms: 3420,
    token_count: 4218,
    error_message: null,
    events: [
      { type: "run_start", nodeIds: ["n_trigger", "n_classify", "n_extract", "n_route"] },

      // Trigger
      { type: "node_status", nodeId: "n_trigger", status: "running" },
      {
        type: "node_output",
        nodeId: "n_trigger",
        output: "Webhook received · /slack/feedback",
      },
      { type: "node_status", nodeId: "n_trigger", status: "success" },

      // AI step (streamed)
      { type: "node_status", nodeId: "n_classify", status: "running" },
      ...chunkTokens(MOCK_AI_OUTPUT),
      { type: "node_output", nodeId: "n_classify", output: MOCK_AI_OUTPUT },
      { type: "node_status", nodeId: "n_classify", status: "success" },

      // Transform
      { type: "node_status", nodeId: "n_extract", status: "running" },
      { type: "node_output", nodeId: "n_extract", output: "high" },
      { type: "node_status", nodeId: "n_extract", status: "success" },

      // Output
      { type: "node_status", nodeId: "n_route", status: "running" },
      {
        type: "node_output",
        nodeId: "n_route",
        output: "POST https://api.linear.app/v1/issues · 201 Created · LIN-4218",
      },
      { type: "node_status", nodeId: "n_route", status: "success" },

      { type: "run_complete" },
    ],
    created_at: "2026-05-27T15:42:00.000Z",
  },
};
