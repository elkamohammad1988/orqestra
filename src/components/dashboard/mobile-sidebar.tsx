"use client";

/**
 * Mobile navigation drawer.
 *
 * Two behaviors worth knowing about:
 *  - Auto-closes when the route changes (`useEffect` on pathname). Without
 *    this, tapping a link would navigate but leave the drawer open over
 *    the new page.
 *  - Locks body scroll while open (`document.body.style.overflow`). On
 *    mobile, scrolling under a fixed-position drawer is jarring; this
 *    keeps the background still. The cleanup in the same effect restores
 *    scroll if the component unmounts while open.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Workflow,
  History,
  Settings,
  Plus,
  X,
  Menu,
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

export function MobileSidebarTrigger() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border bg-card shadow-elevation-4 lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Logo size="sm" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="px-3 pt-3">
                <Link href="/workflows/new">
                  <Button size="default" className="w-full justify-center rounded-md">
                    <Plus className="h-4 w-4" />
                    New workflow
                  </Button>
                </Link>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-0.5">
                  {primaryLinks.map((link) => {
                    const active =
                      link.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="my-4 h-px bg-border/70" />
                <ul className="space-y-0.5">
                  {secondaryLinks.map((link) => {
                    const Icon = link.icon;
                    const active = pathname.startsWith(link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
