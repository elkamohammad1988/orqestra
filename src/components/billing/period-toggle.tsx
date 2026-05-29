"use client";

import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/lib/billing/plans";

interface PeriodToggleProps {
  value: BillingPeriod;
  onChange: (next: BillingPeriod) => void;
  /** Small label shown next to the yearly option, e.g. "Save 20%". */
  yearlyHint?: string;
  className?: string;
}

/**
 * Pill-style toggle between Monthly and Yearly billing.
 *
 * The yearly side carries an optional savings hint to anchor the value of
 * switching periods — pure marketing nudge, no dark pattern. The toggle is
 * a controlled component so both the in-app /upgrade page and the marketing
 * Pricing section can drive it from their own state.
 */
export function PeriodToggle({
  value,
  onChange,
  yearlyHint,
  className,
}: PeriodToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Billing period"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-elevation-1",
        className,
      )}
    >
      <PeriodButton
        active={value === "monthly"}
        onClick={() => onChange("monthly")}
        label="Monthly"
      />
      <PeriodButton
        active={value === "yearly"}
        onClick={() => onChange("yearly")}
        label="Yearly"
        hint={yearlyHint}
      />
    </div>
  );
}

function PeriodButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-foreground text-background shadow-elevation-1"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {hint && (
        <span
          className={cn(
            "rounded-full px-1.5 py-[1px] font-mono text-[9px] tracking-wider transition-colors",
            active
              ? "bg-background/15 text-background"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          )}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
