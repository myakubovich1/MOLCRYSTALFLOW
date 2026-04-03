"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  LoaderCircle,
  RefreshCcw,
  TerminalSquare,
} from "lucide-react";

import { buildCompletedJobResult, normalizeDesktopJobStatus, type DesktopJobSnapshot } from "@/lib/desktop-backend";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

interface LiveResultsClientProps {
  jobId: string;
}

function LogTailPanel({ lines, emptyMessage }: { lines: string[]; emptyMessage: string }) {
  return (
    <Panel className="p-6">
      <div className="flex items-start gap-4">
        <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
          <TerminalSquare className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Log tail</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Recent desktop backend output</h2>
        </div>
      </div>

      {lines.length > 0 ? (
        <div className="theme-subpanel-soft mt-5 rounded-[24px] p-4">
          <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-6">
            {lines.join("\n")}
          </pre>
        </div>
      ) : (
        <p className="theme-text-secondary mt-5 text-sm leading-7">{emptyMessage}</p>
      )}
    </Panel>
  );
}

function PendingResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  const isRunning = snapshot.status === "running";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel className="overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill>{isRunning ? "Running" : "Queued"}</StatusPill>
            <h1 className="theme-text-primary mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              {isRunning ? "Desktop backend is generating candidates" : "Job accepted and waiting to run"}
            </h1>
            <p className="theme-text-secondary mt-5 max-w-2xl text-sm leading-7 sm:text-base">
              The website is polling the connected desktop backend for status updates. This page will refresh into the result dashboard as soon as the
              job reaches `completed`.
            </p>
          </div>
          <div className="theme-subpanel-soft rounded-[24px] px-5 py-4 text-sm">
            <div className="theme-text-muted text-xs uppercase tracking-[0.2em]">Job id</div>
            <div className="theme-text-primary mt-3 font-medium">{snapshot.jobId}</div>
            <div className="theme-text-secondary mt-2">{isRunning ? "Current state: running" : "Current state: queued"}</div>
          </div>
        </div>

        <div className="theme-progress-track mt-8 overflow-hidden rounded-full">
          <div
            className="theme-progress-bar h-2 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: isRunning ? "72%" : "28%" }}
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Job id</p>
            <p className="theme-text-primary mt-2 break-all text-sm font-medium leading-6">{snapshot.jobId}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input file</p>
            <p className="theme-text-primary mt-2 text-lg font-medium">{snapshot.originalFilename ?? "Submitted XYZ payload"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input mode</p>
            <p className="theme-text-primary mt-2 text-lg font-medium">{snapshot.inputMode ?? "Pending"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Status</p>
            <p className="theme-text-primary mt-2 text-lg font-medium">{snapshot.status}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Formula</p>
            <p className="theme-text-primary mt-2 text-lg font-medium">{snapshot.formula ?? "Pending"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidates</p>
            <p className="theme-text-primary mt-2 text-lg font-medium">
              {typeof snapshot.candidateCount === "number" ? snapshot.candidateCount : "Pending"}
            </p>
          </div>
        </div>

        <div className="theme-subpanel-soft mt-6 flex items-start gap-4 rounded-[24px] px-4 py-4">
          <span className="theme-icon-shell-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
            {isRunning ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <HardDrive className="h-5 w-5" />}
          </span>
          <p className="theme-text-secondary text-sm leading-7">
            {isRunning
              ? "The dedicated workstation is processing the conformer and preparing generated artifacts."
              : "The request has reached the backend bridge and is waiting for the desktop execution layer to start the run."}
          </p>
        </div>
      </Panel>

      <LogTailPanel
        lines={snapshot.logTail}
        emptyMessage="Log lines will appear here once the desktop backend begins reporting progress for this job."
      />
    </div>
  );
}

function FailedResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel className="p-6 sm:p-8">
        <StatusPill>Failed</StatusPill>
        <h1 className="theme-text-primary mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Desktop backend reported a failed run</h1>
        <p className="theme-text-secondary mt-5 max-w-2xl text-sm leading-7 sm:text-base">
          The job reached the execution layer, but it did not complete successfully. Review the backend message and recent log output below, then
          submit a new conformer if needed.
        </p>

        <div className="theme-error-banner mt-6 rounded-[24px] px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Backend message</p>
              <p className="mt-2 text-sm leading-7">{snapshot.error ?? "The desktop backend returned a failed status without an explicit message."}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="theme-button-accent inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium">
            <RefreshCcw className="h-4 w-4" />
            Start a new run
          </Link>
        </div>
      </Panel>

      <LogTailPanel lines={snapshot.logTail} emptyMessage="No backend log lines were returned for this failed run." />
    </div>
  );
}

export function LiveResultsClient({ jobId }: LiveResultsClientProps) {
  const [snapshot, setSnapshot] = useState<DesktopJobSnapshot | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let intervalId: number | null = null;

    async function fetchStatus() {
      try {
        const response = await fetch(`/api/jobs/${jobId}/status`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load desktop backend status.");
        }

        const nextSnapshot = normalizeDesktopJobStatus(payload, jobId);

        if (isCancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setRequestError(null);

        if (nextSnapshot.status === "completed" || nextSnapshot.status === "failed") {
          if (intervalId !== null) {
            window.clearInterval(intervalId);
          }
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setRequestError(error instanceof Error ? error.message : "Unable to load desktop backend status.");
      }
    }

    void fetchStatus();
    intervalId = window.setInterval(fetchStatus, 4000);

    return () => {
      isCancelled = true;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [jobId]);

  const completedResult = useMemo(() => {
    if (!snapshot || snapshot.status !== "completed") {
      return null;
    }

    return buildCompletedJobResult(snapshot);
  }, [snapshot]);

  if (requestError && !snapshot) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-6 sm:p-8">
          <StatusPill>Status unavailable</StatusPill>
          <h1 className="theme-text-primary mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Unable to reach the desktop backend bridge</h1>
          <p className="theme-text-secondary mt-5 max-w-2xl text-sm leading-7 sm:text-base">
            The website could not load job status for this result id. Check the bridge configuration and confirm the desktop backend is reachable.
          </p>

          <div className="theme-error-banner mt-6 rounded-[24px] px-5 py-4 text-sm">{requestError}</div>
        </Panel>

        <LogTailPanel lines={[]} emptyMessage="No backend log lines are available because the status request itself failed." />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <Panel className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <LoaderCircle className="theme-text-accent h-5 w-5 animate-spin" />
          <div>
            <p className="theme-text-primary text-sm font-medium">Connecting to desktop backend</p>
            <p className="theme-text-secondary mt-1 text-sm">Loading the initial job status for `{jobId}`.</p>
          </div>
        </div>
      </Panel>
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
