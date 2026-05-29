"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  History,
  Settings,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workflows", href: "/workflows", icon: Workflow },
  { label: "Runs", href: "/runs", icon: History },
];

const secondaryLinks = [
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  /**
   * Workspace usage snapshot from `getUsage()`. Omit in demo mode — the
   * usage card falls back to a placeholder so the layout doesn't shift.
   */
  usage?: {
    planName: string;
    runsUsed: number;
    runsLimit: number;
  };
}

export function Sidebar({ usage }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-card/50 lg:flex lg:flex-col">
      {/* Workspace label — single-workspace today; switcher returns when
          we ship multi-workspace. Rendered as a div so we don't show a
          dropdown affordance for a dropdown that doesn't exist. */}
      <div className="border-b border-border px-3 py-3">
        <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left">
          <Logo size="sm" showWordmark={false} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {usage?.planName ? `${usage.planName} workspace` : "My workspace"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {usage?.planName ?? "Free"} plan
            </div>
          </div>
        </div>
      </div>

      {/* Create workflow CTA */}
      <div className="px-3 pt-3">
        <Link href="/workflows/new">
          <Button size="default" className="w-full justify-center rounded-md">
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {primaryLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              active={
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href)
              }
            />
          ))}
        </ul>

        <div className="my-4 h-px bg-border/70" />

        <ul className="space-y-0.5">
          {secondaryLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              active={pathname.startsWith(link.href)}
            />
          ))}
        </ul>
      </nav>

      {/* Usage card */}
      <UsageCard usage={usage} />
    </aside>
  );
}

function UsageCard({ usage }: { usage?: SidebarProps["usage"] }) {
  const used = usage?.runsUsed ?? 0;
  const limit = usage?.runsLimit ?? 100;
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {usage?.planName ?? "Free"} plan
          </span>
          <span className="font-mono text-muted-foreground">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Workflow runs this month
        </p>
        <Link href="/upgrade">
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full justify-center rounded-md"
          >
            Upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}

function NavItem({
  link,
  active,
}: {
  link: { label: string; href: string; icon: React.ElementType };
  active: boolean;
}) {
  const Icon = link.icon;
  return (
    <li>
      <Link
        href={link.href}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            active
              ? "text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="font-medium">{link.label}</span>
      </Link>
    </li>
  );
}
