"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";

import { buildCompletedJobResult, normalizeDesktopJobStatus, type DesktopJobSnapshot } from "@/lib/desktop-backend";
import { ExampleStructureGrid } from "@/components/results/example-structure-grid";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import type { JobResult } from "@/lib/types";

interface ResultsPaneProps {
  jobId?: string | null;
  context?: "workspace" | "detail";
  onReset?: () => void;
  onSaveCompletedJob?: (job: JobResult) => void;
  isJobSaved?: boolean;
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
  return <ExampleStructureGrid />;
}

function PendingResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  const statusMessage =
    snapshot.status === "running"
      ? "Generating candidate crystal packings and preparing ranked structures."
      : "Submitting the molecular conformer to the generation backend.";

  return (
    <div className="space-y-4">
      <ProgressStepper status={snapshot.status === "running" ? "running" : "queued"} />

      <div className="theme-progress-track overflow-hidden rounded-full">
        <div
          className="theme-progress-bar h-1.5 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: snapshot.status === "running" ? "65%" : "20%" }}
        />
      </div>

      <div className="theme-subpanel-soft rounded-xl p-4">
        <p className="theme-text-primary text-sm font-medium">Generation in progress</p>
        <p className="theme-text-secondary mt-1 text-sm leading-6">
          {statusMessage} Geometry validation, clash checks, and energy ranking are applied before results are shown.
        </p>
      </div>
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
        <details className="theme-subpanel-soft rounded-xl">
          <summary className="theme-text-secondary cursor-pointer px-4 py-3 text-sm font-medium">
            Backend log
          </summary>
          <div className="border-t border-[color:var(--surface-border)] px-4 py-3">
            <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-5">
              {snapshot.logTail.slice(-24).join("\n")}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}

export function ResultsPane({
  jobId,
  context = "workspace",
  onReset,
  onSaveCompletedJob,
  isJobSaved = false,
}: ResultsPaneProps) {
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
    let timeoutId: number | null = null;
    let intervalId: number | null = null;

    setSnapshot(null);
    setRequestError(null);

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

    timeoutId = window.setTimeout(fetchStatus, 750);
    intervalId = window.setInterval(fetchStatus, 4000);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
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
    return (
      <ResultsDashboard
        job={completedResult}
        onReset={onReset}
        onSave={onSaveCompletedJob}
        isSaved={isJobSaved}
      />
    );
  }

  return <PendingResultsView snapshot={snapshot} />;
}
