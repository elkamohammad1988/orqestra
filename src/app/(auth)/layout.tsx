import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuthAside } from "@/components/auth/auth-aside";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* Left — form */}
      <div className="relative flex min-h-screen flex-col lg:min-h-0">
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <Link href="/" aria-label="Orqestra home">
            <Logo size="md" />
          </Link>
          <ThemeToggle />
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <footer className="px-6 py-5 text-xs text-muted-foreground sm:px-10">
          <div className="flex items-center justify-between">
            <p>© {new Date().getFullYear()} Orqestra Labs</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </div>

      {/* Right — visual aside (hidden on mobile) */}
      <AuthAside />
    </div>
  );
}
