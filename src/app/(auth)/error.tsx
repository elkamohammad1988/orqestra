"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  React.useEffect(() => {
    console.error("[auth] error:", error);
  }, [error]);

  return (
    <div className="w-full max-w-[400px] text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-destructive/30 bg-destructive/5 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h1 className="mt-6 text-[22px] font-semibold tracking-tight text-foreground">
        Authentication is unavailable
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        We hit an issue while loading the sign-in flow. Try again, or check
        back in a moment.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={reset} size="lg" className="rounded-md">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
