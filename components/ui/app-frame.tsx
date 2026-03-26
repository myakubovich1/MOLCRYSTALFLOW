import type { ReactNode } from "react";

import Link from "next/link";
import { ArrowUpRight, Orbit } from "lucide-react";

import { StatusPill } from "@/components/ui/status-pill";

interface AppFrameProps {
  children: ReactNode;
}

export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(129,140,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-35" />
      <header className="relative z-10 border-b border-white/6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
              <Orbit className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.16em] text-white">MolCrystalFlow Demo</span>
              <span className="block text-xs text-slate-400">Molecular crystal generation research preview</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <StatusPill>Demo mode</StatusPill>
            <Link
              href="/results/demo-sample"
              className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/[0.05] md:inline-flex"
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
