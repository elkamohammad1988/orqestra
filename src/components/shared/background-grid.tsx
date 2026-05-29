import { cn } from "@/lib/utils";

interface BackgroundGridProps {
  className?: string;
  variant?: "grid" | "dots";
}

/**
 * Decorative background — grid or dot pattern with a radial fade mask.
 * Designed to sit behind hero / section content without competing for attention.
 */
export function BackgroundGrid({
  className,
  variant = "grid",
}: BackgroundGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 mask-radial-fade",
        variant === "grid" ? "bg-grid" : "bg-dots",
        className,
      )}
      aria-hidden
    />
  );
}

export function BackgroundGlow({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 blur-3xl",
        className,
      )}
      aria-hidden
    >
      <div
        className="h-[480px] w-[840px] opacity-[0.18] dark:opacity-[0.22]"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(var(--brand-500)) 0%, transparent 60%)",
        }}
      />
    </div>
  );
}
