/**
 * Billing plans — the single source of truth for what each tier includes.
 *
 * The "Upgrade" CTAs route signed-in users to /upgrade. From there the
 * UpgradeDialog records the user's intent in the `upgrade_requests` table.
 * Wiring Stripe Checkout (Checkout Sessions + webhook → set `plan` column
 * on the user) is the next step; the shape here already covers what
 * billing will read.
 *
 * Yearly pricing is 20% off the monthly run rate, billed once. The
 * `perMonthDisplay` shows users the effective monthly cost so they can
 * compare apples-to-apples on the period toggle.
 */

export type PlanId = "free" | "pro" | "team";
export type BillingPeriod = "monthly" | "yearly";

/**
 * Pricing for a single billing period. `display` is the headline number,
 * `suffix` is the small grey text under it (e.g. "per month", "per user").
 * For yearly periods, `perMonthDisplay` shows the effective monthly cost
 * — surfaces value without making the headline price look bigger.
 */
export interface PlanPrice {
  amount: number;
  display: string;
  suffix: string;
  /** Only set for yearly — e.g. "$15.83 / mo effective". */
  perMonthDisplay?: string;
  /** Only set for yearly — e.g. "Save $46" so the toggle has a payoff. */
  savingsDisplay?: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: Record<BillingPeriod, PlanPrice>;
  /** Hard caps enforced server-side on the relevant endpoints. */
  limits: {
    maxWorkflows: number;
    runsPerMonth: number;
    maxStepsPerWorkflow: number;
    seats: number;
  };
  /** Plain-text bullets for the pricing card. */
  features: string[];
  /** Marketing emphasis — only one plan should set this to true. */
  highlighted?: boolean;
  cta: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Build and ship your first workflows.",
    price: {
      monthly: { amount: 0, display: "$0", suffix: "forever" },
      yearly: { amount: 0, display: "$0", suffix: "forever" },
    },
    limits: {
      maxWorkflows: 3,
      runsPerMonth: 100,
      maxStepsPerWorkflow: 8,
      seats: 1,
    },
    features: [
      "3 workflows",
      "100 runs / month",
      "Up to 8 steps per workflow",
      "Streaming Claude execution",
      "Run history & detail logs",
      "Community support",
    ],
    cta: "Start for free",
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For builders shipping production AI flows.",
    price: {
      monthly: {
        amount: 19,
        display: "$19",
        suffix: "per month",
      },
      yearly: {
        amount: 182, // $19 × 12 × 0.8, rounded
        display: "$182",
        suffix: "billed yearly",
        perMonthDisplay: "$15.17 / mo",
        savingsDisplay: "Save $46",
      },
    },
    limits: {
      maxWorkflows: 50,
      runsPerMonth: 10_000,
      maxStepsPerWorkflow: 25,
      seats: 1,
    },
    features: [
      "50 workflows",
      "10,000 runs / month",
      "Up to 25 steps per workflow",
      "Webhook triggers",
      "Priority Claude routing",
      "Email support",
    ],
    highlighted: true,
    cta: "Upgrade to Pro",
  },
  team: {
    id: "team",
    name: "Team",
    tagline: "Bring your workflows to the rest of the company.",
    price: {
      monthly: {
        amount: 49,
        display: "$49",
        suffix: "per user / month",
      },
      yearly: {
        amount: 470, // $49 × 12 × 0.8, rounded
        display: "$470",
        suffix: "per user, billed yearly",
        perMonthDisplay: "$39.17 / mo",
        savingsDisplay: "Save $118",
      },
    },
    limits: {
      maxWorkflows: 500,
      runsPerMonth: 100_000,
      maxStepsPerWorkflow: 50,
      seats: 10,
    },
    features: [
      "Unlimited workflows",
      "100,000 runs / month",
      "Up to 50 steps per workflow",
      "Webhook + scheduled triggers",
      "Workspace API keys (BYOK)",
      "SSO, audit logs, SLA",
      "Dedicated Slack channel",
    ],
    cta: "Talk to sales",
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "team"];

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

/**
 * Returns the plan id stored on the user. Every account is on `free` until
 * the Stripe webhook flips them to `pro` or `team`. Centralized here so
 * callers don't sprinkle `"free"` literals everywhere.
 */
export function getCurrentPlanId(): PlanId {
  return "free";
}
