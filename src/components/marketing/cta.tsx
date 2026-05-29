"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundGrid } from "@/components/shared/background-grid";

export function CTA() {
  return (
    <section id="get-started" className="relative py-28 sm:py-36">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-elevation-2 sm:px-16 sm:py-20"
        >
          <BackgroundGrid className="opacity-50" />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 blur-3xl"
          >
            <div
              className="h-64 w-[600px] opacity-25"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--brand-500)) 0%, transparent 70%)",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Ship your first AI workflow today.
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Free to start. No credit card. Build, run, and ship production AI
              workflows in the time it takes to read this sentence.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup">
                <Button size="lg" className="rounded-full px-7">
                  Get started free
                  <ArrowRight />
                </Button>
              </Link>
              <a href="mailto:hello@orqestra.ai">
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
                  Talk to founders
                </Button>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
