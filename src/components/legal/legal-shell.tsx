import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface LegalShellProps {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

/**
 * Reusable chrome for Terms / Privacy and other long-form static pages.
 * Wraps the body in `prose`-style typography (resolved through Tailwind
 * utility classes since we don't ship @tailwindcss/typography). The actual
 * legal copy lives in each page so the lawyer (or future you) can edit one
 * file without touching layout.
 */
export function LegalShell({ title, effectiveDate, children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70">
        <div className="container flex items-center justify-between py-5">
          <Link href="/" aria-label="Orqestra home">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="hidden items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-14 sm:py-20">
        <div className="text-[11.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Legal · Effective {effectiveDate}
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <div className="legal mt-10 space-y-7 text-[14.5px] leading-relaxed text-foreground">
          {children}
        </div>

        <div className="mt-16 border-t border-border/70 pt-8 text-[12.5px] text-muted-foreground">
          Questions? Reach us at{" "}
          <a
            href="mailto:hello@orqestra.ai"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            hello@orqestra.ai
          </a>
          .
        </div>
      </main>
    </div>
  );
}
