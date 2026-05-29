"use client";

/**
 * The interactive surface of /upgrade.
 *
 * Layout (top → bottom):
 *   1. Header + period toggle
 *   2. Three plan cards
 *   3. Trust signals row
 *   4. Feature comparison table
 *   5. FAQ
 *
 * State lives here so the period toggle drives every price on the page
 * with no prop-drilling. The dialog is owned at the top so the comparison
 * table's CTAs can open it too.
 */

import * as React from "react";
import {
  CreditCard,
  RotateCw,
  Sparkles,
  ShieldCheck,
  X as XIcon,
} from "lucide-react";
import {
  PLANS,
  PLAN_ORDER,
  type BillingPeriod,
  type PlanId,
} from "@/lib/billing/plans";
import { PeriodToggle } from "@/components/billing/period-toggle";
import { PlanCard } from "@/components/billing/plan-card";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { cn } from "@/lib/utils";

interface UpgradeContentProps {
  /** Plan the user is currently on. We mark this card "Current". */
  currentPlanId: PlanId;
  /** Pre-fills the dialog's email field. Comes from the signed-in user. */
  defaultEmail: string;
}

export function UpgradeContent({
  currentPlanId,
  defaultEmail,
}: UpgradeContentProps) {
  const [period, setPeriod] = React.useState<BillingPeriod>("yearly");
  const [openPlan, setOpenPlan] = React.useState<PlanId | null>(null);

  function handleSelect(planId: PlanId) {
    if (planId === currentPlanId) return;
    if (planId === "team") {
      // Team plan still routes through sales. Stripe Checkout is for Pro.
      window.location.href = "mailto:hello@orqestra.ai?subject=Team plan";
      return;
    }
    setOpenPlan(planId);
  }

  const openedPlan = openPlan ? PLANS[openPlan] : null;

  return (
    <div className="container max-w-6xl py-12 sm:py-16">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-2xl text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Upgrade your workspace
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Pick the plan that fits how you ship.
        </h1>
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-muted-foreground">
          Every plan includes the full editor, streaming execution, webhook
          triggers, and run history. Switch or cancel anytime — no contracts.
        </p>

        <div className="mt-8 inline-flex flex-col items-center gap-2">
          <PeriodToggle
            value={period}
            onChange={setPeriod}
            yearlyHint="Save 20%"
          />
        </div>
      </header>

      {/* ── Plan cards ─────────────────────────────────────────────────── */}
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id, i) => (
          <PlanCard
            key={id}
            plan={PLANS[id]}
            period={period}
            index={i}
            state={id === currentPlanId ? "current" : "available"}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* ── Trust signals ──────────────────────────────────────────────── */}
      <TrustRow />

      {/* ── Feature comparison ─────────────────────────────────────────── */}
      <ComparisonTable
        period={period}
        currentPlanId={currentPlanId}
        onSelect={handleSelect}
      />

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <FAQ />

      {/* ── Dialog ────────────────────────────────────────────────────── */}
      <UpgradeDialog
        open={!!openedPlan}
        onClose={() => setOpenPlan(null)}
        plan={openedPlan ?? PLANS.pro}
        period={period}
        defaultEmail={defaultEmail}
      />
    </div>
  );
}

// ─── Trust signals ──────────────────────────────────────────────────────────

function TrustRow() {
  // Four claims we can actually back up today. Adding any more would
  // start to feel padded — three to four is the sweet spot for a trust row.
  const items = [
    {
      icon: CreditCard,
      title: "No card up front",
      copy: "We confirm by email before any charge.",
    },
    {
      icon: RotateCw,
      title: "Cancel anytime",
      copy: "One-click in Settings. No phone calls, no forms.",
    },
    {
      icon: ShieldCheck,
      title: "Database-level isolation",
      copy: "Postgres RLS scopes every query to its owner.",
    },
    {
      icon: Sparkles,
      title: "Same engine, more room",
      copy: "Higher limits, identical streaming execution.",
    },
  ];
  return (
    <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground">
                {item.title}
              </div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {item.copy}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Feature comparison table ────────────────────────────────────────────────

interface ComparisonRow {
  label: string;
  values: Record<PlanId, string | boolean>;
}

const COMPARISON: { section: string; rows: ComparisonRow[] }[] = [
  {
    section: "Workflows",
    rows: [
      {
        label: "Workflows per workspace",
        values: { free: "3", pro: "50", team: "Unlimited" },
      },
      {
        label: "Steps per workflow",
        values: { free: "8", pro: "25", team: "50" },
      },
      {
        label: "Drafts + saved versions",
        values: { free: true, pro: true, team: true },
      },
    ],
  },
  {
    section: "Execution",
    rows: [
      {
        label: "Runs per month",
        values: { free: "100", pro: "10,000", team: "100,000" },
      },
      {
        label: "Streaming Claude execution",
        values: { free: true, pro: true, team: true },
      },
      {
        label: "Webhook triggers",
        values: { free: false, pro: true, team: true },
      },
      {
        label: "Scheduled triggers",
        values: { free: false, pro: false, team: true },
      },
      {
        label: "Bring-your-own Anthropic key",
        values: { free: false, pro: false, team: true },
      },
    ],
  },
  {
    section: "Observability",
    rows: [
      {
        label: "Run history",
        values: { free: "7 days", pro: "90 days", team: "Unlimited" },
      },
      {
        label: "Per-node event timeline",
        values: { free: true, pro: true, team: true },
      },
      {
        label: "Audit log",
        values: { free: false, pro: false, team: true },
      },
    ],
  },
  {
    section: "Team & support",
    rows: [
      {
        label: "Seats",
        values: { free: "1", pro: "1", team: "10 included" },
      },
      {
        label: "SSO + SCIM",
        values: { free: false, pro: false, team: true },
      },
      {
        label: "Support",
        values: { free: "Community", pro: "Email", team: "Dedicated Slack" },
      },
    ],
  },
];

function ComparisonTable({
  period,
  currentPlanId,
  onSelect,
}: {
  period: BillingPeriod;
  currentPlanId: PlanId;
  onSelect: (planId: PlanId) => void;
}) {
  return (
    <section className="mt-16">
      <header className="mb-6 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Full comparison
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
          Every limit, side by side.
        </h2>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-border">
              <th className="w-1/3 px-5 py-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Feature
              </th>
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const price = plan.price[period];
                const isCurrent = id === currentPlanId;
                return (
                  <th
                    key={id}
                    className={cn(
                      "px-5 py-4",
                      plan.highlighted && "bg-muted/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-foreground">
                        {plan.name}
                      </span>
                      {plan.highlighted && (
                        <span className="rounded-full border border-border bg-card px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                          Recommended
                        </span>
                      )}
                      {isCurrent && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      <span className="text-foreground">{price.display}</span>{" "}
                      {price.suffix}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((group) => (
              <React.Fragment key={group.section}>
                <tr className="border-b border-border/70 bg-muted/30">
                  <th
                    colSpan={4}
                    className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {group.section}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {row.label}
                    </td>
                    {PLAN_ORDER.map((id) => (
                      <td
                        key={id}
                        className={cn(
                          "px-5 py-3",
                          PLANS[id].highlighted && "bg-muted/40",
                        )}
                      >
                        <CellValue value={row.values[id]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
            <tr className="bg-muted/30">
              <td className="px-5 py-4 text-[12px] text-muted-foreground">
                Ready to switch?
              </td>
              {PLAN_ORDER.map((id) => {
                const plan = PLANS[id];
                const isCurrent = id === currentPlanId;
                return (
                  <td
                    key={id}
                    className={cn(
                      "px-5 py-4",
                      plan.highlighted && "bg-muted/40",
                    )}
                  >
                    {isCurrent ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Current
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(id)}
                        className={cn(
                          "text-[12.5px] font-medium underline-offset-4 transition-colors hover:underline",
                          plan.highlighted
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {id === "team" ? "Talk to sales →" : "Choose " + plan.name + " →"}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
        <span className="block h-1.5 w-1.5 rounded-full bg-foreground" />
      </span>
    );
  }
  if (value === false) {
    return (
      <XIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
    );
  }
  return (
    <span className="text-foreground">{value}</span>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

function FAQ() {
  const faqs = [
    {
      q: "What happens when I click upgrade?",
      a: "Stripe Checkout is rolling out. For now we record your request and activate your workspace within 24 hours — no card required up front. You'll only be charged after we confirm by email.",
    },
    {
      q: "Can I switch plans later?",
      a: "Yes, anytime. Upgrades are prorated to your billing cycle and downgrades take effect at the end of the current period. There are no cancellation fees.",
    },
    {
      q: "What counts as a run?",
      a: "One execution of one workflow, end to end. A workflow with 4 AI steps still counts as a single run. Failed runs count too, so you can see exactly what you're spending on.",
    },
    {
      q: "Is my data isolated from other customers?",
      a: "Yes. Every table is governed by Postgres Row-Level Security, scoped to your user id. Even a bug in the application layer can't expose another customer's rows.",
    },
    {
      q: "Do you offer custom plans?",
      a: "For workspaces that need higher limits, custom regions, or a security review, drop a line to hello@orqestra.ai and we'll put together a quote.",
    },
  ];
  return (
    <section className="mx-auto mt-16 max-w-3xl">
      <header className="text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
          Questions
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-foreground sm:text-2xl">
          Things people ask before they upgrade.
        </h2>
      </header>
      <dl className="mt-8 space-y-3">
        {faqs.map((f) => (
          <FAQItem key={f.q} q={f.q} a={f.a} />
        ))}
      </dl>
      <p className="mt-8 text-center text-[12.5px] text-muted-foreground">
        Still on the fence?{" "}
        <a
          href="mailto:hello@orqestra.ai"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Email us
        </a>{" "}
        — we read everything.
      </p>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-foreground/15"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[14px] font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {q}
        <span
          className={cn(
            "grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-transform",
            open && "rotate-45 text-foreground",
          )}
          aria-hidden
        >
          +
        </span>
      </summary>
      <div className="border-t border-border/70 bg-muted/30 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
        {a}
      </div>
    </details>
  );
}
