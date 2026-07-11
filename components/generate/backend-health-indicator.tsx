"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type HealthStatus = "checking" | "healthy" | "unavailable";

export function BackendHealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const [detail, setDetail] = useState("Checking backend");

  useEffect(() => {
    let cancelled = false;

    async function fetchHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = await response.json();

        if (cancelled) return;

        if (!response.ok || payload?.ok !== true) {
          setStatus("unavailable");
          setDetail(typeof payload?.error === "string" ? payload.error : "Backend unavailable");
          return;
        }

        setStatus("healthy");
        setDetail(typeof payload?.detail === "string" ? payload.detail : "Backend connected");
      } catch {
        if (cancelled) return;
        setStatus("unavailable");
        setDetail("Backend unavailable");
      }
    }

    void fetchHealth();
    const intervalId = window.setInterval(fetchHealth, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <span
      title={detail}
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full transition-colors",
        status === "healthy"
          ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
          : status === "unavailable"
            ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
            : "bg-[color:var(--text-muted)] animate-pulse",
      )}
    />
  );
}
