import type { Metadata } from "next";
import { Editor } from "@/components/flow/editor";
import { demoWorkflow } from "@/lib/workflow/mock-workflow";

export const metadata: Metadata = {
  title: "New workflow",
};

interface PageProps {
  searchParams: { template?: string };
}

/**
 * New workflow page.
 *
 * Two entry points:
 *   • `/workflows/new`                  → blank canvas
 *   • `/workflows/new?template=demo`    → seeded from the demo fixture
 *
 * The template path is what the empty-state and the "Use as template" CTA
 * on the public demo land on. The editor opens with the demo's nodes/edges
 * but with workflowId reset to null + saveStatus = "dirty", so the first
 * Save creates a fresh row owned by the current user (RLS-scoped).
 *
 * Once the row is created, the editor topbar replaces the URL with
 * /workflows/<real-id> so the workflow is shareable + bookmarkable.
 */
export default function NewWorkflowPage({ searchParams }: PageProps) {
  if (searchParams.template === "demo") {
    return <Editor initialWorkflow={demoWorkflow} fromTemplate />;
  }
  return <Editor initialWorkflow={null} />;
}
