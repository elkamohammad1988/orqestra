"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendConfirmationEmail } from "@/app/(auth)/actions";

/**
 * Post-signup screen. Tells the user to check their inbox and offers a
 * one-click resend if the confirmation email never arrives. Reads the
 * email from `?email=` (set by the signup action) so the resend button
 * works without re-prompting.
 *
 * A short cooldown (30s) on the resend button prevents accidental spamming
 * of Supabase's transactional mailer, which has its own rate limits.
 */
export function VerifyEmailForm() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [status, setStatus] = React.useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (!email || status === "sending" || cooldown > 0) return;
    setStatus("sending");
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    const result = await resendConfirmationEmail(fd);
    if (result?.error) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setStatus("sent");
    setCooldown(30);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
          Confirm your email
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          {email ? (
            <>
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account.
            </>
          ) : (
            "Check your inbox for a confirmation link to activate your account."
          )}
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-[13px] text-emerald-700 dark:text-emerald-400">
        <MailCheck className="mt-px h-4 w-4 shrink-0" />
        <span>
          The link expires in 1 hour. After clicking it, you&apos;ll be sent
          to the dashboard automatically.
        </span>
      </div>

      {status === "sent" && (
        <div className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 text-[13px] text-foreground">
          <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-500" />
          <span>A new confirmation email is on its way.</span>
        </div>
      )}

      {status === "error" && error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full rounded-lg"
          onClick={handleResend}
          disabled={!email || status === "sending" || cooldown > 0}
        >
          {status === "sending" ? (
            <>
              <Loader2 className="animate-spin" />
              Sending…
            </>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            "Resend confirmation email"
          )}
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
