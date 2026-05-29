"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillingPeriod, Plan } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  plan: Plan;
  period: BillingPeriod;
  /** Index in the row, for the stagger animation only. */
  index?: number;
  /** "current" disables the CTA and replaces it with a non-clickable badge. */
  state?: "available" | "current";
  /** Called when the user clicks the CTA. Parent decides what happens. */
  onSelect?: (planId: Plan["id"]) => void;
  /** When set, render the CTA as an <a> instead of a <button>. */
  ctaHref?: string;
}

/**
 * Plan card — shared between marketing /#pricing and the in-app /upgrade
 * page. Same visual contract everywhere so users don't see two competing
 * pricing UIs.
 *
 * The highlighted plan gets a slightly heavier border + shadow (no glow,
 * no gradient — restraint is part of the premium feel). The card never
 * scales on hover; the CTA button is the only thing that animates.
 */
export function PlanCard({
  plan,
  period,
  index = 0,
  state = "available",
  onSelect,
  ctaHref,
}: PlanCardProps) {
  const highlighted = !!plan.highlighted;
  const price = plan.price[period];
  const isCurrent = state === "current";

  const ctaLabel = isCurrent ? "Current plan" : plan.cta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        delay: index * 0.06,
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-7 transition-shadow",
        highlighted
          ? "border-foreground/30 shadow-elevation-3 hover:shadow-elevation-4"
          : "border-border shadow-elevation-1 hover:shadow-elevation-2",
      )}
    >
      {highlighted && (
        <div className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Recommended
        </div>
      )}

      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
          {plan.name}
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {plan.tagline}
        </p>

        <div className="mt-6">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-semibold leading-none tracking-tight text-foreground">
              {price.display}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {price.suffix}
            </span>
          </div>
          {/* Reserve a constant slot so cards align across the row regardless
             of whether yearly pricing exposes the per-month figure. */}
          <p className="mt-1.5 h-4 text-[11.5px] text-muted-foreground">
            {price.perMonthDisplay && (
              <>
                <span className="text-foreground">{price.perMonthDisplay}</span>
                {price.savingsDisplay && (
                  <>
                    <span className="mx-1.5 text-border">·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {price.savingsDisplay}
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5 text-[13.5px]">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-muted-foreground"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <CardCTA
          label={ctaLabel}
          disabled={isCurrent}
          variant={highlighted && !isCurrent ? "default" : "outline"}
          href={ctaHref}
          onClick={() => onSelect?.(plan.id)}
        />
      </div>
    </motion.div>
  );
}

function CardCTA({
  label,
  disabled,
  variant,
  href,
  onClick,
}: {
  label: string;
  disabled: boolean;
  variant: "default" | "outline";
  href?: string;
  onClick: () => void;
}) {
  if (disabled) {
    return (
      <Button
        type="button"
        size="lg"
        variant="ghost"
        disabled
        className="w-full cursor-default rounded-lg"
      >
        {label}
      </Button>
    );
  }
  if (href) {
    return (
      <a href={href} className="block">
        <Button size="lg" variant={variant} className="w-full rounded-lg">
          {label}
        </Button>
      </a>
    );
  }
  return (
    <Button
      type="button"
      size="lg"
      variant={variant}
      className="w-full rounded-lg"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
