"use client";

/**
 * Mobile editor gate.
 *
 * The workflow editor is built around React Flow's drag-and-drop canvas
 * plus pixel-precise sidebars. None of it survives contact with a phone
 * screen — touch drags conflict with pan, the inspector overflows the
 * viewport, keyboard shortcuts don't exist on iOS, and the run console
 * gets buried.
 *
 * Rather than ship a half-working mobile editor that frustrates users,
 * we detect narrow viewports and show a friendly "use a laptop"
 * interstitial with deep-links back to the parts of the product that DO
 * work on mobile (dashboard + run history).
 *
 * Why media query in JS, not CSS:
 *   Hiding the editor with `hidden lg:block` would still mount React Flow
 *   and run its effects, costing bundle size and burning the user's
 *   battery before they ever see the message. We unmount the editor on
 *   narrow screens instead.
 */

import * as React from "react";
import Link from "next/link";
import { Laptop, LayoutDashboard, ArrowRight } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";

const BREAKPOINT_PX = 1024; // matches Tailwind's lg:

export function MobileEditorGate({ children }: { children: React.ReactNode }) {
  // Start optimistic: assume desktop until the client tells us otherwise.
  // This avoids a flash of the mobile gate on a hydrating desktop session.
  const [isNarrow, setIsNarrow] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsNarrow(e.matches);
    };
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (mounted && isNarrow) {
    return <MobileInterstitial />;
  }
  return <>{children}</>;
}

function MobileInterstitial() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/70">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" aria-label="Orqestra home">
            <Logo size="md" />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-foreground">
            <Laptop className="h-5 w-5" />
          </div>

          <h1 className="mt-6 text-balance text-2xl font-semibold tracking-tight text-foreground">
            The editor needs a bigger screen
          </h1>
          <p className="mt-3 text-pretty text-[14.5px] leading-relaxed text-muted-foreground">
            Workflow editing relies on drag-and-drop and keyboard shortcuts
            that don&apos;t work well on phones. Open this page on a laptop
            or tablet to keep going.
          </p>

          <p className="mt-3 text-[12.5px] text-muted-foreground">
            Or come back when you&apos;re at a desk — the URL works as a
            bookmark.
          </p>

          <div className="mt-8 flex flex-col gap-2">
            <Link href="/dashboard">
              <Button size="lg" className="w-full rounded-md">
                <LayoutDashboard className="h-4 w-4" />
                Go to dashboard
              </Button>
            </Link>
            <Link href="/runs">
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-md"
              >
                View run history
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
