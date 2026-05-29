"use client";

/**
 * Editor error boundary.
 *
 * Catches anything that throws inside the (editor) route segment — most
 * commonly:
 *   • React Flow choking on a corrupt nodes/edges payload (e.g. an edge
 *     pointing at a deleted node id, or position values that aren't finite).
 *   • The Zustand store throwing during hydration if a workflow row's JSONB
 *     somehow doesn't conform to the WorkflowNode discriminated union.
 *
 * Without this file, those throws bubble up to the root error boundary and
 * the user sees a blank page. With it, they get a friendly recovery UI
 * with a Reset button that calls Next's `reset()` to remount the segment.
 *
 * `error.tsx` MUST be a Client Component — Next mounts it as the React
 * error boundary, which only Client Components can be.
 */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function EditorError({ error, reset }: EditorErrorProps) {
  // Surface the error to the browser console for the user / us to inspect.
  // In production Next strips most details and only ships `digest` (a hash
  // that maps to the server log), which is the right tradeoff.
  React.useEffect(() => {
    console.error("[editor] error:", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <h1 className="mt-6 text-[22px] font-semibold tracking-tight text-foreground">
          The editor hit a snag
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Something went wrong while loading this workflow. Try resetting the
          canvas — if it keeps happening, head back to your workflows list
          and re-open it.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            size="lg"
            className="rounded-md"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
          <Link href="/workflows">
            <Button variant="outline" size="lg" className="w-full rounded-md sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Back to workflows
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
