"use client";

import * as React from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type AuthResult,
} from "@/app/(auth)/actions";

export function ForgotPasswordForm() {
  // Two display states drive the UI:
  //   - 'pending' covers the in-flight submission (handled by useFormStatus
  //     inside SubmitButton, so we don't track it here).
  //   - 'sent' flips the form into a confirmation pane after a successful
  //     submit. The pane shows the same message regardless of whether the
  //     email is actually registered — see the privacy note in the action.
  const [error, setError] = React.useState<string | null>(null);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    const result: AuthResult = await requestPasswordReset(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="space-y-7">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            If an account exists for{" "}
            <span className="font-medium text-foreground">{sentTo}</span>,
            we&apos;ve sent a link to reset your password.
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[13px] text-emerald-700 dark:text-emerald-400">
          <MailCheck className="mt-px h-4 w-4 shrink-0" />
          <span>
            The link expires in 1 hour. If you don&apos;t see it, check your
            spam folder.
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full rounded-lg"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </Button>
          <Link
            href="/login"
            className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Enter the email you signed up with and we&apos;ll send you a link
          to choose a new password.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
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

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SubmitButton />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/login"
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
          Sending link…
        </>
      ) : (
        "Send reset link"
      )}
    </Button>
  );
}
