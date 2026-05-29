"use client";

/**
 * Dashboard error boundary.
 *
 * Catches errors raised by any (dashboard) page — typically Supabase
 * queries that fail because the schema is out of sync or the network
 * blipped. Rendered INSIDE the dashboard shell, so the sidebar and topbar
 * stay visible and the user can navigate away.
 *
 * For corruption in the underlying data (e.g. workflow row missing nodes),
 * the page-level not-found.tsx is a better fit — this boundary is for
 * exceptions, not "row doesn't exist".
 */

import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  React.useEffect(() => {
    console.error("[dashboard] error:", error);
  }, [error]);

  return (
    <div className="container grid min-h-[60vh] place-items-center py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h1 className="mt-6 text-[22px] font-semibold tracking-tight text-foreground">
          We couldn&apos;t load this page
        </h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Something went wrong fetching your data. Try again — if it keeps
          happening, our status page will have details.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            ref: {error.digest}
          </p>
        )}
        <Button onClick={reset} size="lg" className="mt-6 rounded-md">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
