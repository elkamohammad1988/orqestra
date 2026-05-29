/**
 * Workflow editor page.
 *
 * Loading strategy:
 *   1. Special id `demo` → hand back the public demo fixture (read-only).
 *      No auth needed. This is what the landing CTA opens.
 *   2. Supabase is configured AND user is signed in → fetch the row.
 *      RLS makes "not yours" indistinguishable from "doesn't exist".
 *   3. Otherwise → fall back to the mock fixture so local dev (without
 *      Supabase keys) still gets a usable editor.
 *
 * The Editor component is a Client Component (React Flow is browser-only),
 * but this page is a Server Component. The workflow fetch happens server-
 * side and gets handed to the editor as a prop — no client-side fetch, no
 * loading spinner, no flash of empty canvas.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/components/flow/editor";
import { demoWorkflow } from "@/lib/workflow/mock-workflow";
import { getWorkflow } from "@/lib/workflow/persistence";
import { isSupabaseConfigured } from "@/lib/env";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  if (params.id === "demo") return { title: "Demo workflow" };
  if (!isSupabaseConfigured()) return { title: "Workflow" };
  const wf = await getWorkflow(params.id);
  return { title: wf?.name ?? "Workflow" };
}

export default async function WorkflowEditorPage({ params }: PageProps) {
  // ── Public demo ────────────────────────────────────────────────────────
  if (params.id === "demo") {
    return <Editor initialWorkflow={demoWorkflow} readOnly />;
  }

  // ── Real Supabase row (when configured) ────────────────────────────────
  if (isSupabaseConfigured()) {
    const workflow = await getWorkflow(params.id);
    if (!workflow) notFound();
    return <Editor initialWorkflow={workflow} />;
  }

  // ── Dev fallback ───────────────────────────────────────────────────────
  // Without Supabase keys, render the demo fixture so the editor still
  // works for local screenshots and design iteration.
  return <Editor initialWorkflow={demoWorkflow} />;
}
