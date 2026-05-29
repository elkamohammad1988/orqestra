"use client";

import { motion } from "framer-motion";
import { MousePointer2, Link2, Play } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: MousePointer2,
    title: "Drop in your building blocks",
    description:
      "Drag triggers, AI calls, transforms, and outputs onto the canvas. Configure each with a few clicks.",
  },
  {
    number: "02",
    icon: Link2,
    title: "Wire them together",
    description:
      "Connect nodes to define the flow. Branch on conditions, fan out in parallel, merge results downstream.",
  },
  {
    number: "03",
    icon: Play,
    title: "Run, debug, ship",
    description:
      "Run the workflow live with streaming output, inspect every step, then ship as an API, schedule, or webhook.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-border/60 bg-muted/30 py-28 sm:py-36"
    >
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              From idea to production in minutes.
            </h2>
          </motion.div>
        </div>

        <div className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="relative"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-background shadow-elevation-1">
                    <Icon className="h-[18px] w-[18px] text-foreground" />
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
