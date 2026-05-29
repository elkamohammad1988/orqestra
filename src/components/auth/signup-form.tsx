"use client";

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
  signUpWithPassword,
  signInWithGoogle,
  type AuthResult,
} from "@/app/(auth)/actions";

export function SignupForm() {
  const [error, setError] = React.useState<string | null>(null);
  // Same `next` plumbing as the login form — preserves intent across the
  // middleware → /signup → action redirect chain.
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result: AuthResult = await signUpWithPassword(formData);
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
          Create your workspace
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Start building AI workflows in under a minute.
        </p>
      </div>

      <OAuthButton provider="google" onClick={handleGoogle} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs uppercase tracking-widest text-muted-foreground">
            or sign up with email
          </span>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Ada Lovelace"
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <TurnstileWidget />

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton />

        <p className="text-xs leading-relaxed text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full rounded-lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Creating account…
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}
