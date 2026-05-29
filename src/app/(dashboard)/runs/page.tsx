import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecentRuns } from "@/components/dashboard/recent-runs";

export const metadata: Metadata = {
  title: "Runs",
};

// Always run on the server, never cache — the runs list is live data that
// must reflect the most recent execution. Without this, Next would serve
// stale results after a navigation.
export const dynamic = "force-dynamic";

export default function RunsPage() {
  return (
    <div className="container py-8 sm:py-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
              Runs
            </h1>
            <Badge variant="outline" className="font-mono">
              live
            </Badge>
          </div>
          <p className="mt-1.5 text-[14.5px] text-muted-foreground">
            Every workflow execution across your workspace.
          </p>
        </div>
      </div>

      <div className="mt-7">
        {/* hideHeader avoids the "View all → /runs" link that would loop back
            to this page. emptyState upgrades the empty case from a single
            line into a real onboarding moment. */}
        <RecentRuns
          limit={50}
          hideHeader
          emptyState={<RunsEmptyState />}
        />
      </div>
    </div>
  );
}

/**
 * First-view of /runs for a freshly signed-up user. Mirrors the dashboard
 * empty-state hierarchy (icon → headline → body → primary CTA) so the
 * onboarding rhythm carries between pages.
 */
function RunsEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Soft radial background — same treatment as the dashboard empty card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative grid place-items-center px-6 py-16 text-center sm:py-20">
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-background text-foreground shadow-elevation-1">
          <Activity className="h-5 w-5" />
        </div>

        <h2 className="mt-6 text-balance text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
          Your run history starts here.
        </h2>
        <p className="mt-2 max-w-md text-pretty text-[14px] leading-relaxed text-muted-foreground">
          Every workflow execution lands on this page with a full timeline of
          each node, streamed tokens, and the final output. Trigger one to
          see what it looks like.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/workflows/demo">
            <Button size="lg" className="rounded-md">
              <Play className="fill-current" />
              Open the live demo
            </Button>
          </Link>
          <Link href="/workflows">
            <Button
              size="lg"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Browse workflows
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
