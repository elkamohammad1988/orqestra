import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Orqestra mark — a stylized "O" composed of orchestrated connection points.
 * Monochrome by default. Pairs with the wordmark for the navbar.
 */
export function Logo({
  showWordmark = true,
  size = "md",
  className,
  ...props
}: LogoProps) {
  const dimensions = {
    sm: { box: "h-6 w-6", text: "text-base" },
    md: { box: "h-7 w-7", text: "text-[17px]" },
    lg: { box: "h-9 w-9", text: "text-xl" },
  }[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)} {...props}>
      <LogoMark className={dimensions.box} />
      {showWordmark && (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            dimensions.text,
          )}
        >
          Orqestra
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-[7px] bg-foreground text-background shadow-elevation-2",
        className,
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5"
      >
        {/* Three orchestrated nodes connected — symbolizes the workflow graph */}
        <circle cx="6" cy="6" r="2.2" fill="currentColor" />
        <circle cx="18" cy="6" r="2.2" fill="currentColor" />
        <circle cx="12" cy="18" r="2.2" fill="currentColor" />
        <path
          d="M6 6 L12 18 M18 6 L12 18 M6 6 L18 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
