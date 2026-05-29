import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mask-radial-fade bg-grid"
      />

      <div className="relative flex flex-col items-center text-center">
        <Logo size="lg" />

        <p className="mt-10 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Error 404
        </p>

        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          This workflow doesn&apos;t exist.
        </h1>
        <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-muted-foreground">
          The page you&apos;re looking for has been moved, deleted, or never
          existed. Let&apos;s get you back to the canvas.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/">
            <Button size="lg" variant="outline" className="rounded-md">
              <ArrowLeft />
              Back to home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" className="rounded-md">
              <Home />
              Go to dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
