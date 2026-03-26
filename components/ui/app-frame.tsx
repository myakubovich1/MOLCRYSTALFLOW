import type { ReactNode } from "react";

import Link from "next/link";
import { ArrowUpRight, Orbit } from "lucide-react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { StatusPill } from "@/components/ui/status-pill";

interface AppFrameProps {
  children: ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] theme-text-primary">
      <div className="theme-backdrop pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-35" />
      <header className="relative z-10 border-b border-[color:var(--header-border)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
              <Orbit className="h-5 w-5" />
            </span>
            <span>
              <span className="theme-text-primary block text-sm font-semibold tracking-[0.16em]">MolCrystalFlow Demo</span>
              <span className="theme-text-secondary block text-xs">Molecular crystal generation research preview</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <StatusPill>Demo mode</StatusPill>
            <ThemeToggle />
            <Link
              href="/results/demo-sample"
              className="theme-button-outline hidden items-center gap-2 rounded-full px-4 py-2 text-sm transition md:inline-flex"
            >
              Open sample
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 py-10 lg:px-8 lg:py-14">{children}</main>
    </div>
  );
}
