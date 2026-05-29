"use client";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserMenu } from "./user-menu";
import { MobileSidebarTrigger } from "./mobile-sidebar";
import { Logo } from "@/components/shared/logo";

interface TopbarProps {
  user: { email: string | null; name: string | null; avatar_url: string | null };
}

export function Topbar({ user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-6">
      {/* Left — mobile menu + logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <MobileSidebarTrigger />
        <Logo size="sm" />
      </div>

      {/* Spacer pushes the action cluster to the right on desktop */}
      <div className="hidden flex-1 lg:block" />

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <div className="mx-1 h-5 w-px bg-border" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
