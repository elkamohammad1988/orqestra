"use client";

/**
 * Settings page — the interactive sections.
 *
 * The page itself is a Server Component that fetches user + usage and
 * passes both into this Client Component. Splitting them this way means:
 *  - The initial render is server-side (no flash of "loading…").
 *  - The forms can use Server Actions + useFormStatus for pending UI
 *    without needing a Suspense boundary.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  updateProfile,
  updateAccountPassword,
  deleteAccount,
  type ActionResult,
} from "@/app/(dashboard)/settings/actions";
import type { Usage } from "@/lib/billing/types";
import { usagePercent } from "@/lib/billing/types";
import { cn } from "@/lib/utils";

interface SettingsSectionsProps {
  user: { id: string; email: string | null; name: string | null };
  usage: Usage;
  canDeleteAccount: boolean;
}

export function SettingsSections({
  user,
  usage,
  canDeleteAccount,
}: SettingsSectionsProps) {
  return (
    <div className="space-y-12">
      <AccountSection user={user} />
      <PasswordSection />
      <BillingSection usage={usage} />
      <DangerZone canDeleteAccount={canDeleteAccount} email={user.email} />
    </div>
  );
}

// ─── Account ────────────────────────────────────────────────────────────────

function AccountSection({
  user,
}: {
  user: { email: string | null; name: string | null };
}) {
  const [name, setName] = React.useState(user.name ?? "");
  const [toast, setToast] = React.useState<ToastState | null>(null);

  async function handle(formData: FormData) {
    setToast(null);
    const res: ActionResult = await updateProfile(formData);
    setToast(toastFor(res, "Profile updated."));
  }

  return (
    <Section id="account" icon={UserIcon} title="Account" subtitle="Your profile across the workspace.">
      <form action={handle} className="space-y-5">
        <Field label="Display name" htmlFor="name">
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </Field>
        <Field label="Email" htmlFor="email" hint="Email changes aren't supported yet — contact support if you need this.">
          <Input
            id="email"
            value={user.email ?? ""}
            readOnly
            disabled
            className="text-muted-foreground"
          />
        </Field>
        <FormRow toast={toast}>
          <SubmitButton idleLabel="Save profile" pendingLabel="Saving…" />
        </FormRow>
      </form>
    </Section>
  );
}

// ─── Password ───────────────────────────────────────────────────────────────

function PasswordSection() {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  async function handle(formData: FormData) {
    setToast(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setToast({ kind: "error", text: "Passwords don't match." });
      return;
    }
    const res: ActionResult = await updateAccountPassword(formData);
    if (res.ok) formRef.current?.reset();
    setToast(toastFor(res, "Password updated."));
  }

  return (
    <Section id="password" title="Password" subtitle="Use at least 8 characters.">
      <form ref={formRef} action={handle} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="New password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm password" htmlFor="confirm">
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
        </div>
        <FormRow toast={toast}>
          <SubmitButton idleLabel="Update password" pendingLabel="Updating…" />
        </FormRow>
      </form>
    </Section>
  );
}

// ─── Billing ────────────────────────────────────────────────────────────────

function BillingSection({ usage }: { usage: Usage }) {
  const runsPct = usagePercent(
    usage.runsThisMonth.used,
    usage.runsThisMonth.limit,
  );
  const wfPct = usagePercent(usage.workflows.used, usage.workflows.limit);

  return (
    <Section
      id="billing"
      icon={CreditCard}
      title="Billing & usage"
      subtitle="Your plan and current consumption."
    >
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
                {usage.plan.name} plan
              </h3>
              <Badge variant="outline" className="font-mono">
                {usage.plan.price.monthly.display} {usage.plan.price.monthly.suffix}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {usage.plan.tagline}
            </p>
          </div>
          <Link href="/upgrade">
            <Button size="sm" variant="outline" className="rounded-md">
              Compare plans
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <UsageBar
            label="Workflows"
            used={usage.workflows.used}
            limit={usage.workflows.limit}
            percent={wfPct}
          />
          <UsageBar
            label="Runs this month"
            used={usage.runsThisMonth.used}
            limit={usage.runsThisMonth.limit}
            percent={runsPct}
          />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-[12.5px] text-muted-foreground">
          <span>
            Need higher limits or invoices? Upgrade your plan or reach out.
          </span>
          <Link href="/upgrade">
            <Button size="sm" className="rounded-md">
              Upgrade
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

function UsageBar({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  const accent =
    percent >= 90
      ? "bg-amber-500"
      : percent >= 70
        ? "bg-foreground"
        : "bg-foreground";
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", accent)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Danger zone ────────────────────────────────────────────────────────────

function DangerZone({
  canDeleteAccount,
  email,
}: {
  canDeleteAccount: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requiredText = email ?? "delete my account";
  const canSubmit = confirmText.trim() === requiredText.trim();

  async function handle() {
    if (!canSubmit || pending) return;
    setPending(true);
    setError(null);
    const res = await deleteAccount();
    setPending(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    // Success branch throws redirect server-side; just in case the action
    // returns instead, push the user to home so the dashboard doesn't show
    // a stale shell.
    router.push("/");
  }

  return (
    <Section
      id="danger"
      icon={Trash2}
      title="Danger zone"
      subtitle="Irreversible actions."
      destructive
    >
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-destructive">
              Delete account
            </h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Permanently removes your account, workflows, and run history.
              {!canDeleteAccount &&
                " This action requires the service role key on the server."}
            </p>
          </div>
          {!confirming ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-md"
              disabled={!canDeleteAccount}
              onClick={() => setConfirming(true)}
            >
              Delete account
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
                setError(null);
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {confirming && (
          <div className="mt-5 space-y-3 border-t border-destructive/20 pt-5">
            <Label htmlFor="confirm-delete" className="text-foreground">
              Type{" "}
              <span className="font-mono text-foreground">
                {requiredText}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={requiredText}
              autoComplete="off"
            />
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-[12.5px] text-destructive">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-md"
              disabled={!canSubmit || pending}
              onClick={handle}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "I understand, delete my account"
              )}
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}

// ─── Pure presentation helpers ──────────────────────────────────────────────

interface ToastState {
  kind: "ok" | "error";
  text: string;
}

function toastFor(res: ActionResult, okText: string): ToastState {
  if (res.error) return { kind: "error", text: res.error };
  return { kind: "ok", text: okText };
}

function FormRow({
  toast,
  children,
}: {
  toast: ToastState | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-h-[20px] text-[12.5px]">
        {toast?.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {toast.text}
          </span>
        )}
        {toast?.kind === "ok" && (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {toast.text}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="rounded-md" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
  destructive,
}: {
  id: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <header className="mb-4 flex items-start gap-3">
        {Icon && (
          <div
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-md border",
              destructive
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-card text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="text-[12.5px] text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && (
        <p className="text-[11.5px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
