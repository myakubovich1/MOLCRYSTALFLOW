import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return <div className={cn("surface-panel", className)}>{children}</div>;
}
