import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

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
        <div className={`mx-auto flex w-full items-center justify-between gap-4 px-6 py-5 lg:px-8 2xl:px-10 ${wide ? "max-w-none" : "max-w-7xl"}`}>
          <Link href="/" className="group inline-flex items-center gap-3" aria-label="MolCrystalFlow home">
            <span className="relative flex h-12 w-[84px] shrink-0 items-center justify-center">
              <Image
                src="/brand/MCF_Icon_Transparent.png"
                alt=""
                width={608}
                height={350}
                priority
                className="h-11 w-auto object-contain drop-shadow-[0_10px_22px_rgba(26,131,255,0.12)] transition duration-200 group-hover:scale-[1.02]"
              />
            </span>
            <span
              aria-hidden="true"
              className="theme-text-primary hidden text-xl font-semibold tracking-[0.08em] sm:inline-block"
            >
              MolCrystalFlow
            </span>
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
