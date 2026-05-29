"use client";

/**
 * Code section — showcases the webhook trigger (a real, shipping feature).
 *
 * Earlier drafts pitched an SDK, REST API, and YAML spec — none of which
 * ship today. Pretending otherwise is the kind of marketing claim that
 * loses trust the first time an evaluator pokes at it. This rewrite
 * sticks to what users actually get: a per-workflow webhook URL, a JSON
 * contract, and runs visible in the dashboard.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { Terminal, Webhook, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "curl", label: "curl", icon: Terminal },
  { id: "node", label: "Node.js", icon: Webhook },
  { id: "response", label: "Response", icon: FileJson },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CodeSection() {
  const [active, setActive] = React.useState<TabId>("curl");

  return (
    <section className="relative py-28 sm:py-36">
      <div className="container">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="lg:sticky lg:top-32"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Trigger from anywhere
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[44px] lg:leading-[1.05]">
              A webhook for every workflow.
            </h2>
            <p className="mt-5 text-pretty text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              Each workflow gets a unique, token-authenticated POST endpoint.
              Wire it to Slack, your backend, a CRON job, or anything that can
              hit a URL — and runs show up live in your dashboard.
            </p>
            <ul className="mt-8 space-y-3.5 text-[14.5px] text-foreground">
              {[
                "Unique URL + secret token per workflow",
                "Send JSON, plain text, or any payload as the trigger input",
                "Same execution engine, cost guards, and run history as the editor",
                "Cancel or rotate the token from the inspector at any time",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg
                    className="mt-1 h-4 w-4 shrink-0 text-foreground"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
                    <path
                      d="M5 8.5 L7 10.5 L11 6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right — code panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-3">
              {/* Tab bar */}
              <div className="flex items-center border-b border-border bg-muted/30 px-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActive(tab.id)}
                      className={cn(
                        "relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors",
                        active === tab.id
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {tab.label}
                      {active === tab.id && (
                        <motion.div
                          layoutId="code-tab-active"
                          className="absolute inset-x-1 -bottom-px h-px bg-foreground"
                        />
                      )}
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-1 pr-2 font-mono text-[10px] text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  live
                </div>
              </div>

              {/* Code body */}
              <div className="relative">
                <pre className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-relaxed text-foreground">
                  <code>{snippets[active]}</code>
                </pre>
              </div>
            </div>

            {/* Soft glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-12 -bottom-6 h-20 rounded-full bg-foreground/20 opacity-25 blur-3xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Snippets ───────────────────────────────────────────────────────────────
//
// These are the EXACT shapes the /api/webhooks/[workflowId] route accepts and
// returns today. If you change the route's contract, update these too — the
// landing page is a partial spec.

const snippets: Record<TabId, React.ReactNode> = {
  curl: (
    <>
      <span className="text-muted-foreground">
        {"# Trigger a workflow from anywhere"}
      </span>
      {"\n"}
      <span className="text-foreground">curl</span>
      {" -X "}
      <span className="text-emerald-600 dark:text-emerald-400">POST</span>
      {" \\\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        https://orqestra.app/api/webhooks/
      </span>
      <span className="text-brand-500 dark:text-brand-400">$WORKFLOW_ID</span>
      {" \\\n  -H "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;X-Orqestra-Token: $TOKEN&quot;
      </span>
      {" \\\n  -H "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;Content-Type: application/json&quot;
      </span>
      {" \\\n  -d "}
      <span className="text-emerald-600 dark:text-emerald-400">
        {"'{\"input\":\"Customer says the dashboard is slow\"}'"}
      </span>
    </>
  ),
  node: (
    <>
      <span className="text-muted-foreground">
        {"// Fire from a Slack handler, cron job, anywhere"}
      </span>
      {"\n"}
      <span className="text-brand-500 dark:text-brand-400">const</span>
      {" "}
      <span className="text-foreground">res</span>
      {" = "}
      <span className="text-brand-500 dark:text-brand-400">await</span>
      {" "}
      <span className="text-foreground">fetch</span>
      {"(\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        `https://orqestra.app/api/webhooks/${"${id}"}`
      </span>
      {",\n  {\n    "}
      <span className="text-foreground">method</span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;POST&quot;
      </span>
      {",\n    "}
      <span className="text-foreground">headers</span>
      {": {\n      "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;X-Orqestra-Token&quot;
      </span>
      {": token,\n      "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;Content-Type&quot;
      </span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;application/json&quot;
      </span>
      {",\n    },\n    "}
      <span className="text-foreground">body</span>
      {": "}
      <span className="text-foreground">JSON</span>
      {".stringify({ "}
      <span className="text-foreground">input</span>
      {": message }),\n  },\n);\n\n"}
      <span className="text-brand-500 dark:text-brand-400">const</span>
      {" "}
      <span className="text-foreground">run</span>
      {" = "}
      <span className="text-brand-500 dark:text-brand-400">await</span>
      {" res."}
      <span className="text-foreground">json</span>
      {"();"}
    </>
  ),
  response: (
    <>
      <span className="text-foreground">{"{"}</span>
      {"\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;runId&quot;
      </span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;b1a8c7f2-4d3e-…&quot;
      </span>
      {",\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;status&quot;
      </span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;success&quot;
      </span>
      {",\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;durationMs&quot;
      </span>
      {": "}
      <span className="text-brand-500 dark:text-brand-400">1842</span>
      {",\n  "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;outputs&quot;
      </span>
      {": [\n    {\n      "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;nodeId&quot;
      </span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;classify&quot;
      </span>
      {",\n      "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;output&quot;
      </span>
      {": "}
      <span className="text-emerald-600 dark:text-emerald-400">
        &quot;performance&quot;
      </span>
      {"\n    }\n  ]\n"}
      <span className="text-foreground">{"}"}</span>
    </>
  ),
};
