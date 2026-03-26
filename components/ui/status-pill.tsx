import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusPillProps {
  children: ReactNode;
  className?: string;
}

export function StatusPill({ children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-200/80",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />
      {children}
    </span>
  );
}
