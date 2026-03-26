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
        "theme-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em]",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent-shadow)]" />
      {children}
    </span>
  );
}
