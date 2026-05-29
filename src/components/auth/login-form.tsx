"use client";

/**
 * Sign-in form. Wires the form's `action` straight to the server action
 * (`signInWithPassword`). No fetch, no API route — Next handles the round
 * trip and passes us back either `{ error }` or never (because the action
 * called `redirect()` which throws on the server).
 *
 * Loading state comes from `useFormStatus()` inside the SubmitButton
 * subcomponent. It must live in a child of the form, not the form itself —
 * that's a React requirement, not a stylistic choice.
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButton } from "./oauth-button";
import { TurnstileWidget } from "./turnstile-widget";
import {
  signInWithPassword,
  signInWithGoogle,
  type AuthResult,
} from "@/app/(auth)/actions";

export function LoginForm() {
  const [error, setError] = React.useState<string | null>(null);
  // The middleware appends `?next=` whenever it bounces an unauthenticated
  // user here from a protected page. We thread it back into the action so
  // the post-login redirect lands on the page they originally wanted —
  // critical for the "fork the demo as a template" flow.
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result: AuthResult = await signInWithPassword(formData);
    // We only get here on failure — success threw a `redirect()` inside
    // the server action and the browser is already navigating away.
    if (result?.error) setError(result.error);
  }

  async function handleGoogle() {
    setError(null);
    const result = await signInWithGoogle(next);
    if (result?.error) setError(result.error);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Sign in to continue building with Orqestra.
        </p>
      </div>

      <OAuthButton provider="google" onClick={handleGoogle} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {/* Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. The
            server action verifies the resulting token before sign-in. */}
        <TurnstileWidget />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton label="Sign in" />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full rounded-lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Signing in…
        </>
      ) : (
        label
      )}
    </Button>
  );
}
