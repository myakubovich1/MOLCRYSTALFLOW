"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Generate",
  },
  {
    href: "/about",
    label: "About",
  },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] p-1 shadow-[inset_0_1px_0_var(--surface-highlight)]"
    >
      {navItems.map((item) => {
        const isActive = item.href === "/about" ? pathname === "/about" : pathname !== "/about";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              isActive
                ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                : "theme-text-secondary hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text-primary)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
