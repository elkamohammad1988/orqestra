import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkflowCard } from "@/components/dashboard/workflow-card";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { WorkflowEmptyState } from "@/components/dashboard/empty-state";
import { mockWorkflows, mockMetrics, type MockWorkflow } from "@/lib/mock-data";
import { listWorkflows } from "@/lib/workflow/persistence";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Workflow } from "@/types";

/**
 * Convert a real Supabase workflow into the display shape the card expects.
 * The dashboard card shows summary stats (runs, success rate, sparkline)
 * that aren't denormalized onto the persisted row yet. When a run-summary
 * column lands the defaults below will be replaced by computed values.
 */
function realToDisplay(w: Workflow): MockWorkflow {
  return {
    id: w.id,
    name: w.name,
    description: w.description ?? "",
    status: w.nodes.length === 0 ? "draft" : "healthy",
    steps: w.nodes.length,
    runs: 0,
    successRate: 0,
    lastRunAt: "never",
    updatedBy: { name: "You", initials: "YO" },
    runsSparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    tags: [],
  };
}

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your AI workflow workspace.",
};

export default async function DashboardPage() {
  // Three rendering modes, picked from {is signed in?} × {has workflows?}:
  //   • Signed-in + has workflows → show real data with honest "—" stats.
  //   • Signed-in + empty workspace → show the onboarding empty state.
  //   • Anonymous / demo mode      → show mock fixtures for the screenshot.
  // We only check `user` to distinguish the empty-onboarding case from the
  // marketing-style demo render; the actual data queries already RLS-scope.
  const real = isSupabaseConfigured() ? await listWorkflows() : [];
  const hasReal = real.length > 0;

  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  }

  const showOnboarding = signedIn && !hasReal;
  const workflows: MockWorkflow[] = hasReal
    ? real.map(realToDisplay)
    : mockWorkflows;

  // Stats: keep the showy mock fixtures when the workspace is empty (so
  // the page looks like a real product in screenshots), but switch to
  // honest "—" placeholders the moment the user has real workflows.
  // Runs history / latency / tokens are computed from a runs table that
  // we haven't built yet.
  return (
    <div
      className="
        container
        py-8 sm:py-10
      "
    >
      {/* Page header */}
      <div
        className="
          flex flex-col sm:flex-row sm:items-end sm:justify-between
          gap-4
        "
      >
        <div>
          <h1
            className="
              text-2xl text-foreground sm:text-[28px] font-semibold
              tracking-tight
            "
          >
            Overview
          </h1>
          <p
            className="
              mt-1.5
              text-[14.5px] text-muted-foreground
            "
          >
            {showOnboarding
              ? "Welcome to Orqestra. Build your first workflow to get started."
              : "Welcome back. Here's what's running in your workspace."}
          </p>
        </div>
        <div
          className="
            flex items-center
            gap-2
          "
        >
          <Link href="/workflows/new">
            <Button
              className="
                rounded-md
              "
            >
              <Plus />
              New workflow
            </Button>
          </Link>
        </div>
      </div>

      {showOnboarding && (
        <div className="mt-8">
          <WorkflowEmptyState />
        </div>
      )}

      {!showOnboarding && (
        <>

      {/* Stats row */}
      <div
        className="
          grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
          mt-7
          gap-3
        "
      >
        {hasReal ? (
          <>
            <StatCard
              label="Workflows"
              value={real.length.toString()}
            />
            <StatCard label="Total runs" value="—" />
            <StatCard label="Avg latency" value="—" />
            <StatCard label="Tokens used" value="—" unit="this month" />
          </>
        ) : (
          <>
            <StatCard
              label="Total runs"
              value={mockMetrics.totalRuns.value.toLocaleString()}
              delta={mockMetrics.totalRuns.delta}
              sparkline={mockMetrics.totalRuns.sparkline}
            />
            <StatCard
              label="Avg latency"
              value={mockMetrics.avgLatency.value}
              delta={mockMetrics.avgLatency.delta}
              invertDelta
              sparkline={mockMetrics.avgLatency.sparkline}
            />
            <StatCard
              label="Success rate"
              value={mockMetrics.successRate.value}
              delta={mockMetrics.successRate.delta}
              sparkline={mockMetrics.successRate.sparkline}
            />
            <StatCard
              label="Tokens used"
              value={mockMetrics.tokensUsed.value}
              delta={mockMetrics.tokensUsed.delta}
              unit="this month"
              sparkline={mockMetrics.tokensUsed.sparkline}
            />
          </>
        )}
      </div>

      {/* Two-column lower section */}
      <div
        className="
          grid grid-cols-1 xl:grid-cols-[1fr_380px]
          mt-10
          gap-8
        "
      >
        {/* Workflows */}
        <div
          className="
            min-w-0
          "
        >
          <div
            className="
              flex items-center justify-between
              mb-4
            "
          >
            <div>
              <h2
                className="
                  text-[18px] text-foreground font-semibold tracking-tight
                "
              >
                Workflows
              </h2>
              <p
                className="
                  text-[12.5px] text-muted-foreground
                "
              >
                {workflows.length} total · {workflows.filter((w) => w.status === "healthy").length} healthy
              </p>
            </div>
            <Link
              href="/workflows"
              className="
                text-[12.5px] text-muted-foreground hover:text-foreground
                font-medium
                transition-colors
              "
            >
              View all →
            </Link>
          </div>

          <div
            className="
              grid grid-cols-1 lg:grid-cols-2
              gap-3
            "
          >
            {workflows.slice(0, 4).map((wf) => (
              <WorkflowCard key={wf.id} workflow={wf} isReal={hasReal} />
            ))}
          </div>
        </div>

        {/* Recent runs sidebar */}
        <aside
          className="
            min-w-0
          "
        >
          <RecentRuns />
        </aside>
      </div>
        </>
      )}
    </div>
  );
}
