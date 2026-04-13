import type { ReactNode } from "react";

import Link from "next/link";
import { Orbit } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { TopNav } from "@/components/ui/top-nav";

interface AppFrameProps {
  children: ReactNode;
  wide?: boolean;
}

export function AppFrame({ children, wide = false }: AppFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] theme-text-primary">
      <div className="theme-backdrop pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-35" />
      <header className="relative z-10 border-b border-[color:var(--header-border)]">
        <div className={`mx-auto flex w-full items-center justify-between gap-4 px-6 py-4 lg:px-8 2xl:px-10 ${wide ? "max-w-none" : "max-w-7xl"}`}>
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="theme-icon-shell-accent flex h-9 w-9 items-center justify-center rounded-xl">
              <Orbit className="h-4.5 w-4.5" />
            </span>
            <span className="theme-text-primary text-sm font-semibold tracking-wide">MolCrystalFlow</span>
          </Link>

          <div className="flex items-center gap-3">
            <TopNav />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className={`relative z-10 mx-auto w-full px-6 py-8 lg:px-8 lg:py-10 2xl:px-10 ${wide ? "max-w-none" : "max-w-7xl"}`}>{children}</main>
    </div>
  );
}
