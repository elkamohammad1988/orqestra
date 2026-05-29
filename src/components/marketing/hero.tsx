"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BackgroundGrid,
  BackgroundGlow,
} from "@/components/shared/background-grid";
import { WorkflowPreview } from "@/components/marketing/workflow-preview";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero() {
  return (
    <section
      className="
        relative overflow-hidden
        pt-32 sm:pt-40
      "
    >
      <BackgroundGrid />
      <BackgroundGlow />

      <div
        className="
          container relative
        "
      >
        <motion
          .div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="
            flex flex-col items-center
            max-w-4xl
            mx-auto
            text-center
          "
        >
          <motion.div variants={itemVariants}>
            <Link
              href="#pricing"
              className="
                inline-flex items-center
                py-1 pl-1 pr-3
                text-xs text-muted-foreground hover:text-foreground font-medium
                bg-background/60
                rounded-full border border-border
                shadow-elevation-1 backdrop-blur transition-colors
                group gap-2
              "
            >
              <span
                className="
                  inline-flex items-center
                  px-2 py-0.5
                  font-mono font-semibold text-[9px] text-background uppercase
                  tracking-[0.12em]
                  bg-foreground
                  rounded-full
                  gap-1.5
                "
              >
                NEW
              </span>
              <span>Free tier — no card required</span>
              <ArrowRight
                className="
                  h-3 w-3
                  transition-transform
                  group-hover:translate-x-0.5
                "
                /
              >
            </Link>
          </motion.div>

          <motion
            .h1
            variants={itemVariants}
            className="
              mt-7
              text-balance text-[44px] text-foreground sm:text-6xl lg:text-[72px]
              font-semibold leading-[1.04] tracking-[-0.025em]
            "
          >
            Visual orchestration
            <br />
            <span
              className="
                text-gradient
              "
            >for production AI.</span>
          </motion.h1>

          <motion
            .p
            variants={itemVariants}
            className="
              max-w-2xl
              mt-7
              text-pretty text-[17px] text-muted-foreground sm:text-lg
              leading-relaxed
            "
          >
            The canvas where you design, run, and observe Claude-powered
            workflows. From a single prompt to a production pipeline — without
            the glue code.
          </motion.p>

          <motion
            .div
            variants={itemVariants}
            className="
              flex flex-col sm:flex-row items-center
              mt-10
              gap-3
            "
          >
            <Link href="/workflows/demo">
              <Button
                size="lg"
                className="
                  px-7
                  rounded-full
                "
              >
                Try the live demo
                <ArrowRight
                  className="
                    ml-0.5
                  "
                  /
                >
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="lg"
                variant="outline"
                className="
                  px-6
                  bg-background/60
                  rounded-full
                  backdrop-blur
                "
              >
                Sign up free
              </Button>
            </Link>
          </motion.div>

          <motion
            .div
            variants={itemVariants}
            className="
              flex flex-wrap items-center justify-center
              mt-5
              text-xs text-muted-foreground
              gap-x-5 gap-y-2
            "
          >
            <span
              className="
                flex items-center
                gap-1.5
              "
            >
              <svg
                className="
                  h-3 w-3
                "
                viewBox="0 0 12 12" fill="none"
              >
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.4" />
                <path d="M4 6L5.5 7.5L8 5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Open the demo without signing up
            </span>
            <span
              className="
                hidden sm:inline-block
                h-3 w-px
                bg-border
              "
              /
            >
            <span
              className="
                flex items-center
                gap-1.5
              "
            >
              <svg
                className="
                  h-3 w-3
                "
                viewBox="0 0 12 12" fill="none"
              >
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.4" />
                <path d="M4 6L5.5 7.5L8 5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              Live Claude streaming
            </span>
            <span
              className="
                hidden sm:inline-block
                h-3 w-px
                bg-border
              "
              /
            >
            <span
              className="
                flex items-center
                gap-1.5
              "
            >
              <svg
                className="
                  h-3 w-3
                "
                viewBox="0 0 12 12" fill="none"
              >
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeOpacity="0.4" />
                <path d="M4 6L5.5 7.5L8 5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              No credit card
            </span>
          </motion.div>
        </motion.div>

        <motion
          .div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="
            relative
            max-w-6xl
            mx-auto mt-20
          "
        >
          <WorkflowPreview />
        </motion.div>
      </div>
    </section>
  );
}
