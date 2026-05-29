import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkflowsBrowser } from "@/components/dashboard/workflows-browser";
import { mockWorkflows, type MockWorkflow } from "@/lib/mock-data";
import { listWorkflows } from "@/lib/workflow/persistence";
import { isSupabaseConfigured } from "@/lib/env";
import type { Workflow } from "@/types";

export const metadata: Metadata = {
  title: "Workflows",
};

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

export default async function WorkflowsPage() {
  // Three modes, picked from {Supabase configured?} × {has workflows?}:
  //   • Configured + N workflows  → show real rows
  //   • Configured + 0 workflows  → empty list (browser renders empty state)
  //   • Unconfigured (demo/portfolio) → show mock fixtures
  const real = isSupabaseConfigured() ? await listWorkflows() : [];
  const workflows: MockWorkflow[] = isSupabaseConfigured()
    ? real.map(realToDisplay)
    : mockWorkflows;

  return (
    <div className="container py-8 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              Workflows
            </h1>
            <Badge variant="outline" className="font-mono">
              {workflows.length}
            </Badge>
          </div>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            All workflows in your workspace. Drag onto the canvas to compose
            new ones.
          </p>
        </div>
        <Link href="/workflows/new">
          <Button className="rounded-md">
            <Plus />
            New workflow
          </Button>
        </Link>
      </div>

      <div className="mt-7">
        <WorkflowsBrowser workflows={workflows} isReal={real.length > 0} />
      </div>
    </div>
  );
}
