"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Atom, LoaderCircle } from "lucide-react";

import { buildCompletedJobResult, normalizeDesktopJobStatus, type DesktopJobSnapshot } from "@/lib/desktop-backend";
import { ResultsDashboard } from "@/components/results/results-dashboard";

interface ResultsPaneProps {
  jobId?: string | null;
  context?: "workspace" | "detail";
}

const progressSteps = [
  { key: "submitting", label: "Submitting" },
  { key: "running", label: "Running MolCrystalFlow" },
  { key: "processing", label: "Processing results" },
] as const;

function ProgressStepper({ status }: { status: "queued" | "running" }) {
  const activeIndex = status === "running" ? 1 : 0;

  return (
    <div className="flex items-center gap-3">
      {progressSteps.map((step, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            {index > 0 && (
              <div className={`h-px w-6 ${isDone ? "bg-[color:var(--accent)]" : "bg-[color:var(--surface-border)]"}`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isActive
                    ? "bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent-shadow)] animate-pulse"
                    : isDone
                      ? "bg-[color:var(--accent)]"
                      : "bg-[color:var(--surface-border)]"
                }`}
              />
              <span
                className={`text-sm ${
                  isActive ? "theme-text-primary font-medium" : isDone ? "theme-text-accent" : "theme-text-muted"
                }`}
              >
                {isActive ? `${step.label}...` : step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultsPaneEmpty() {
  return (
    <div className="flex items-center gap-3 py-16 justify-center">
      <Atom className="theme-text-muted h-5 w-5" />
      <p className="theme-text-secondary text-sm">No structures generated yet. Enter a conformer and click &ldquo;Generate Structures&rdquo; to begin.</p>
    </div>
  );
}

function PendingResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  return (
    <div className="space-y-4">
      <ProgressStepper status={snapshot.status === "running" ? "running" : "queued"} />

      <div className="theme-progress-track overflow-hidden rounded-full">
        <div
          className="theme-progress-bar h-1.5 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: snapshot.status === "running" ? "65%" : "20%" }}
        />
      </div>

      {snapshot.logTail.length > 0 && (
        <div className="theme-subpanel-soft rounded-xl p-4">
          <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-5">
            {snapshot.logTail.slice(-8).join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

function FailedResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  return (
    <div className="space-y-4">
      <div className="theme-error-banner flex items-start gap-3 rounded-xl px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-sm font-medium">Generation failed</p>
          <p className="mt-1 text-sm">{snapshot.error ?? "The backend returned a failed status. Try submitting again."}</p>
        </div>
      </div>

      {snapshot.logTail.length > 0 && (
        <div className="theme-subpanel-soft rounded-xl p-4">
          <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-5">
            {snapshot.logTail.slice(-12).join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ResultsPane({ jobId, context = "workspace" }: ResultsPaneProps) {
  const [snapshot, setSnapshot] = useState<DesktopJobSnapshot | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setSnapshot(null);
      setRequestError(null);
      return;
    }

    const resolvedJobId = jobId;
    let isCancelled = false;
    let intervalId: number | null = null;

    async function fetchStatus() {
      try {
        const response = await fetch(`/api/jobs/${resolvedJobId}/status`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load job status.");
        }

        const nextSnapshot = normalizeDesktopJobStatus(payload, resolvedJobId);

        if (isCancelled) return;

        setSnapshot(nextSnapshot);
        setRequestError(null);

        if (nextSnapshot.status === "completed" || nextSnapshot.status === "failed") {
          if (intervalId !== null) window.clearInterval(intervalId);
        }
      } catch (error) {
        if (isCancelled) return;
        setRequestError(error instanceof Error ? error.message : "Unable to load job status.");
      }
    }

    void fetchStatus();
    intervalId = window.setInterval(fetchStatus, 4000);

    return () => {
      isCancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [jobId]);

  const completedResult = useMemo(() => {
    if (!snapshot || snapshot.status !== "completed") return null;
    return buildCompletedJobResult(snapshot);
  }, [snapshot]);

  if (!jobId) {
    return <ResultsPaneEmpty />;
  }

  if (requestError && !snapshot) {
    return (
      <div className="theme-error-banner flex items-start gap-3 rounded-xl px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Backend unavailable</p>
          <p className="mt-1">{requestError}</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="flex items-center gap-3 py-8">
        <LoaderCircle className="theme-text-accent h-5 w-5 animate-spin" />
        <p className="theme-text-secondary text-sm">Connecting to backend...</p>
      </div>
    );
  }

  if (snapshot.status === "failed") {
    return <FailedResultsView snapshot={snapshot} />;
  }

  if (completedResult) {
    return <ResultsDashboard job={completedResult} />;
  }

  return <PendingResultsView snapshot={snapshot} />;
}
