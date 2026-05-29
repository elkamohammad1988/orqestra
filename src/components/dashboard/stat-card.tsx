import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  /** Percentage change. Positive = up. */
  delta?: number;
  /** When true, a negative delta is shown as good (e.g. latency went down). */
  invertDelta?: boolean;
  sparkline?: number[];
  /** Optional unit shown small after the value */
  unit?: string;
}

export function StatCard({
  label,
  value,
  delta,
  invertDelta = false,
  sparkline,
  unit,
}: StatCardProps) {
  const isGood =
    delta === undefined
      ? null
      : invertDelta
        ? delta < 0
        : delta > 0;
  const isFlat = delta === 0;

  const DeltaIcon = isFlat ? Minus : isGood ? TrendingUp : TrendingDown;
  const deltaColor = isFlat
    ? "text-muted-foreground bg-muted"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-elevation-1 transition-colors hover:border-foreground/15">
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium",
              deltaColor,
            )}
          >
            <DeltaIcon className="h-2.5 w-2.5" />
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <div className="text-[26px] font-semibold leading-none tracking-tight text-foreground nums">
          {value}
        </div>
        {unit && (
          <div className="text-[11px] text-muted-foreground">{unit}</div>
        )}
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 -mb-1 -mx-1 h-7 text-foreground/60 group-hover:text-foreground transition-colors">
          <Sparkline
            data={sparkline}
            width={220}
            height={28}
            color="currentColor"
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}
