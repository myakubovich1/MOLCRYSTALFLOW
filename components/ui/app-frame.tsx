import type { ReactNode } from "react";

import Link from "next/link";
import { Orbit } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StatusPill } from "@/components/ui/status-pill";
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
        <div className={`mx-auto flex w-full flex-col gap-4 px-6 py-5 lg:px-8 2xl:px-10 xl:flex-row xl:items-center xl:justify-between ${wide ? "max-w-none" : "max-w-7xl"}`}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
                <Orbit className="h-5 w-5" />
              </span>
              <span>
                <span className="theme-text-primary block text-sm font-semibold tracking-[0.16em]">MolCrystalFlow Demo</span>
                <span className="theme-text-secondary block text-xs">Molecular crystal generation research preview</span>
              </span>
            </Link>
            <div className="xl:hidden">
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end xl:gap-4">
            <TopNav />
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill>Research Preview</StatusPill>
              <div className="hidden xl:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className={`relative z-10 mx-auto w-full px-6 py-8 lg:px-8 lg:py-10 2xl:px-10 ${wide ? "max-w-none" : "max-w-7xl"}`}>{children}</main>
    </div>
  );
}
