/**
 * Small, dependency-free helpers used everywhere. Keep this file tight —
 * anything domain-specific belongs in lib/<domain>/.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` is the standard shadcn helper. Two things happen, in order:
 *   1. `clsx` flattens nested arrays/objects/conditionals into a string.
 *   2. `twMerge` resolves Tailwind conflicts — `cn("p-2", "p-4")` → "p-4".
 *
 * This matters because we frequently pass user-supplied `className` last
 * to allow overrides (`<Button className="bg-red-500" />` should win over
 * the variant's default `bg-primary`). Without twMerge they'd both ship to
 * the DOM and the cascade order would decide — flaky.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
