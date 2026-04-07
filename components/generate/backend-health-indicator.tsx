"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type HealthState =
  | { status: "checking"; detail: string }
  | { status: "healthy"; detail: string }
  | { status: "unavailable"; detail: string };

export function BackendHealthIndicator() {
  const [health, setHealth] = useState<HealthState>({
    status: "checking",
    detail: "Checking desktop backend",
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const response = await fetch("/api/health", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || payload?.ok !== true) {
          setHealth({
            status: "unavailable",
            detail: typeof payload?.error === "string" ? payload.error : "Desktop backend unavailable",
          });
          return;
        }

        setHealth({
          status: "healthy",
          detail: typeof payload?.detail === "string" ? payload.detail : "Desktop backend reachable",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setHealth({
          status: "unavailable",
          detail: error instanceof Error ? error.message : "Desktop backend unavailable",
        });
      }
    }

    void fetchHealth();
    const intervalId = window.setInterval(fetchHealth, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
        health.status === "healthy"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
          : health.status === "unavailable"
            ? "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] theme-text-secondary",
      )}
      title={health.detail}
    >
      {health.status === "healthy" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : health.status === "unavailable" ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      )}
      <span>
        {health.status === "healthy"
          ? "Desktop backend connected"
          : health.status === "unavailable"
            ? "Backend unavailable"
            : "Checking backend"}
      </span>
    </div>
  );
}
