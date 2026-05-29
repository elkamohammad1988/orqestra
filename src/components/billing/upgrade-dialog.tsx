"use client";

/**
 * Upgrade confirmation dialog.
 *
 * Two-step flow:
 *   1. Order summary + early-access form (single screen).
 *   2. Success acknowledgement.
 *
 * Why a single confirm-screen instead of "Continue to Stripe":
 *   We don't ship Stripe Checkout yet. Pretending we do (fake redirect,
 *   skeleton checkout iframe) erodes trust the first time someone notices.
 *   Instead we frame this as early access: the order summary makes the
 *   intent concrete (plan, period, price), the form captures who to
 *   contact, and the success state promises an email within 24 hours.
 *   Once Stripe is live the dialog swaps in a Checkout Session redirect
 *   and the order summary stays put.
 *
 * Accessibility:
 *   • ESC closes.
 *   • Backdrop click closes.
 *   • Initial focus on first input.
 *   • Background scroll locked while open.
 * Built without @radix-ui/react-dialog to avoid a new dependency for one
 * surface; if more modals land later, swap in Radix Dialog wholesale.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestUpgradeAccess,
  type UpgradeRequestResult,
} from "@/app/(dashboard)/upgrade/actions";
import type { BillingPeriod, Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  plan: Plan;
  period: BillingPeriod;
  /** Pre-fills the email field. The user can still change it. */
  defaultEmail: string;
}

type Step = "form" | "success";

export function UpgradeDialog({
  open,
  onClose,
  plan,
  period,
  defaultEmail,
}: UpgradeDialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [email, setEmail] = React.useState(defaultEmail);
  const [note, setNote] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  // Portal target only exists after first render in the browser.
  React.useEffect(() => setMounted(true), []);

  // Reset internal state every time the dialog (re)opens so the user
  // doesn't see leftover form values from a previous session.
  React.useEffect(() => {
    if (!open) return;
    setStep("form");
    setEmail(defaultEmail);
    setNote("");
    setError(null);
    setPending(false);
    // Focus the first input on the next tick (after the animation starts).
    const t = window.setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, defaultEmail]);

  // ESC to close + body scroll lock while open.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    const result: UpgradeRequestResult = await requestUpgradeAccess({
      planId: plan.id,
      period,
      email,
      note: note || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Try again.");
      return;
    }
    setStep("success");
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-dialog-title"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-4"
          >
            <CloseButton onClose={onClose} />

            {step === "form" ? (
              <FormStep
                plan={plan}
                period={period}
                email={email}
                setEmail={setEmail}
                note={note}
                setNote={setNote}
                error={error}
                pending={pending}
                firstInputRef={firstInputRef}
                onSubmit={handleSubmit}
              />
            ) : (
              <SuccessStep
                email={email}
                planName={plan.name}
                onClose={onClose}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Steps ───────────────────────────────────────────────────────────────────

function FormStep({
  plan,
  period,
  email,
  setEmail,
  note,
  setNote,
  error,
  pending,
  firstInputRef,
  onSubmit,
}: {
  plan: Plan;
  period: BillingPeriod;
  email: string;
  setEmail: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  error: string | null;
  pending: boolean;
  firstInputRef: React.RefObject<HTMLInputElement>;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const price = plan.price[period];

  return (
    <form onSubmit={onSubmit}>
      <header className="border-b border-border px-6 pb-5 pt-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Order summary
        </p>
        <h2
          id="upgrade-dialog-title"
          className="mt-2 text-[20px] font-semibold tracking-tight text-foreground"
        >
          Upgrade to {plan.name}
        </h2>
      </header>

      {/* Order summary */}
      <div className="space-y-3 px-6 py-5">
        <SummaryRow
          label="Plan"
          value={
            <span className="flex items-center gap-1.5">
              <span className="text-foreground">{plan.name}</span>
              <span className="rounded-md border border-border bg-background px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {period}
              </span>
            </span>
          }
        />
        <SummaryRow
          label="Renews"
          value={
            <span className="text-muted-foreground">
              {period === "yearly" ? "Every 12 months" : "Every month"}
            </span>
          }
        />
        <div className="my-1 h-px bg-border" />
        <SummaryRow
          label="Total"
          value={
            <span className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-semibold tracking-tight text-foreground">
                {price.display}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                {price.suffix}
              </span>
            </span>
          }
          strong
        />
        {price.perMonthDisplay && (
          <p className="text-right text-[11.5px] text-muted-foreground">
            <span className="text-foreground">{price.perMonthDisplay}</span>
            {price.savingsDisplay && (
              <>
                {" · "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {price.savingsDisplay}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {/* Activation form */}
      <div className="border-t border-border bg-muted/30 px-6 py-5">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">
            We&apos;re rolling out paid plans to early customers.
          </span>{" "}
          Confirm your email and we&apos;ll activate {plan.name} on your
          workspace within 24 hours — no card needed up front.
        </p>

        <div className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label
              htmlFor="upgrade-email"
              className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Email
            </Label>
            <Input
              id="upgrade-email"
              ref={firstInputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="upgrade-note"
              className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Note <span className="normal-case text-muted-foreground/70">(optional)</span>
            </Label>
            <textarea
              id="upgrade-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Team size, anything we should know…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <footer className="space-y-3 px-6 pb-6 pt-5">
        <Button
          type="submit"
          size="lg"
          className="w-full rounded-lg"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Sending…
            </>
          ) : (
            <>Activate {plan.name}</>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          You&apos;ll only be charged after we confirm by email. Cancel
          anytime.
        </p>
      </footer>
    </form>
  );
}

function SuccessStep({
  email,
  planName,
  onClose,
}: {
  email: string;
  planName: string;
  onClose: () => void;
}) {
  return (
    <div className="px-6 py-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-[20px] font-semibold tracking-tight text-foreground">
        We&apos;ve got your request
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
        We&apos;ll activate {planName} on your workspace and email{" "}
        <span className="font-medium text-foreground">{email}</span> within
        24 hours.
      </p>

      <div className="mt-7">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full rounded-lg"
          onClick={onClose}
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── Bits ───────────────────────────────────────────────────────────────────

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close upgrade dialog"
      className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span
        className={cn(
          strong
            ? "font-medium text-foreground"
            : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span className={cn("text-right", strong ? "" : "")}>{value}</span>
    </div>
  );
}
