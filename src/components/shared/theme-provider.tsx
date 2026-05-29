"use client";

/**
 * Thin wrapper around `next-themes`.
 *
 * Why wrap at all? Two reasons:
 *  1. `next-themes` exports a client-only `ThemeProvider`. By isolating
 *     it here we keep the "use client" boundary minimal — the root layout
 *     stays a Server Component.
 *  2. If we ever need to add cross-cutting theme behavior (analytics on
 *     toggle, telemetry, system-theme sync), this is the single place to
 *     do it without touching the layout.
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
