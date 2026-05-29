"use client";

import * as React from "react";
import { PLANS, PLAN_ORDER, type BillingPeriod } from "@/lib/billing/plans";
import { PeriodToggle } from "@/components/billing/period-toggle";
import { PlanCard } from "@/components/billing/plan-card";

/**
 * Pricing — three-card section anchored at #pricing.
 *
 * The visual contract here mirrors /upgrade exactly so a signed-out
 * visitor and a signed-in user see the same UI. The only difference is
 * the CTA target: every card here routes to /signup. After sign-up the
 * user lands on the in-app /upgrade page where the same cards convert
 * the click into an UpgradeDialog.
 */
export function Pricing() {
  const [period, setPeriod] = React.useState<BillingPeriod>("yearly");

  return (
    <section
      id="pricing"
      className="relative border-t border-border py-24 sm:py-32"
    >
      <div className="container max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
            Pricing
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Start free. Scale when you need to.
          </h2>
          <p className="mt-4 text-pretty text-[15.5px] leading-relaxed text-muted-foreground">
            Every plan includes the full editor, streaming execution, and run
            history. Pay when you outgrow the free tier.
          </p>

          <div className="mt-8 inline-flex">
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              yearlyHint="Save 20%"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLAN_ORDER.map((id, i) => (
            <PlanCard
              key={id}
              plan={PLANS[id]}
              period={period}
              index={i}
              ctaHref={
                id === "team"
                  ? "mailto:hello@orqestra.ai?subject=Team plan"
                  : "/signup"
              }
            />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[12.5px] text-muted-foreground">
          Need a custom plan, dedicated capacity, or a security review?{" "}
          <a
            href="mailto:hello@orqestra.ai"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Talk to us
          </a>
          .
        </p>
      </div>
    </section>
  );
}
