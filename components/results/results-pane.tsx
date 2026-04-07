"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ExternalLink,
  HardDrive,
  LoaderCircle,
  TerminalSquare,
} from "lucide-react";

import { buildCompletedJobResult, normalizeDesktopJobStatus, type DesktopJobSnapshot } from "@/lib/desktop-backend";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { MoleculePreview } from "@/components/results/molecule-preview";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

interface ResultsPaneProps {
  jobId?: string | null;
  context?: "workspace" | "detail";
}

function ResultsPaneHeader({ jobId, context }: { jobId?: string | null; context: "workspace" | "detail" }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Generated molecules</p>
        <h2 className="theme-text-primary mt-3 text-3xl font-semibold tracking-tight 2xl:text-4xl">Crystal candidate workspace</h2>
        <p className="theme-text-secondary mt-4 text-sm leading-7">
          This side of the interface shows live backend status, generated artifact files, candidate summaries, and the reserved structure-viewer
          surface for the current run.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {jobId ? <span className="theme-chip rounded-full px-3 py-1.5 text-xs">Job {jobId}</span> : null}
        {context === "workspace" && jobId ? (
          <Link href={`/results/${jobId}`} className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm">
            <ExternalLink className="h-4 w-4" />
            Open result page
          </Link>
        ) : null}
        {context === "detail" ? (
          <Link href="/" className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm">
            Back to Generate
          </Link>
        ) : null}
      </div>
    </div>
  );
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
          <h3 className="theme-text-primary mt-3 text-xl font-semibold">Recent backend output</h3>
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

function ResultsPaneEmpty() {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <MoleculePreview graph={null} />

        <Panel className="p-6 sm:p-7">
          <StatusPill>No active job</StatusPill>
          <h3 className="theme-text-primary mt-5 text-2xl font-semibold">No structures generated yet</h3>
          <p className="theme-text-secondary mt-4 text-sm leading-7">
            Submit one XYZ conformer from the left panel to start a backend run. Completed jobs will populate this space with summary metrics,
            downloadable artifacts, and structure previews.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Expected outputs</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">pred_combined.xyz, crystals_z2.xyz, crystals_z4.xyz</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Job states</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">Queued, running, completed, and failed are shown here inline.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidate count</p>
              <p className="theme-text-primary mt-3 text-3xl font-semibold">0</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Z values</p>
              <p className="theme-text-primary mt-3 text-3xl font-semibold">Pending</p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function PendingResultsView({ snapshot }: { snapshot: DesktopJobSnapshot }) {
  const isRunning = snapshot.status === "running";

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="overflow-hidden p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusPill>{isRunning ? "Running" : "Queued"}</StatusPill>
            <h3 className="theme-text-primary mt-5 text-2xl font-semibold">
              {isRunning ? "Desktop backend is generating candidates" : "Job accepted and waiting to run"}
            </h3>
            <p className="theme-text-secondary mt-4 text-sm leading-7">
              The right pane will update automatically as soon as the backend reports new status or returns generated files.
            </p>
          </div>
          <div className="theme-subpanel-soft rounded-[22px] px-4 py-3 text-sm">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Job id</p>
            <p className="theme-text-primary mt-2 break-all font-medium">{snapshot.jobId}</p>
          </div>
        </div>

        <div className="theme-progress-track mt-6 overflow-hidden rounded-full">
          <div
            className="theme-progress-bar h-2 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: isRunning ? "70%" : "28%" }}
          />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input file</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{snapshot.originalFilename ?? "Submitted XYZ payload"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input mode</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{snapshot.inputMode ?? "Pending"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Status</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{snapshot.status}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Formula</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{snapshot.formula ?? "Pending"}</p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidates</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">
              {typeof snapshot.candidateCount === "number" ? snapshot.candidateCount : "Pending"}
            </p>
          </div>
          <div className="theme-subpanel rounded-[22px] p-4">
            <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Z values</p>
            <p className="theme-text-primary mt-3 text-sm font-medium leading-6">
              {snapshot.zValues.length > 0 ? snapshot.zValues.join(", ") : "Pending"}
            </p>
          </div>
        </div>

        <div className="theme-subpanel-soft mt-5 flex items-start gap-4 rounded-[24px] p-4">
          <span className="theme-icon-shell-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
            {isRunning ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <HardDrive className="h-5 w-5" />}
          </span>
          <p className="theme-text-secondary text-sm leading-7">
            {isRunning
              ? "The dedicated workstation is processing the conformer and preparing generated artifact files."
              : "The request has reached the backend bridge and is waiting for desktop execution to begin."}
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
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="p-6 sm:p-7">
        <StatusPill>Failed</StatusPill>
        <h3 className="theme-text-primary mt-5 text-2xl font-semibold">Desktop backend reported a failed run</h3>
        <p className="theme-text-secondary mt-4 text-sm leading-7">
          The job reached the execution layer, but it did not complete successfully. Review the backend message and recent log output, then submit a
          new conformer if needed.
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
      </Panel>

      <LogTailPanel lines={snapshot.logTail} emptyMessage="No backend log lines were returned for this failed run." />
    </div>
  );
}

export function ResultsPane({ jobId, context = "workspace" }: ResultsPaneProps) {
  const [snapshot, setSnapshot] = useState<DesktopJobSnapshot | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const activeJobId = jobId;

    if (!activeJobId) {
      setSnapshot(null);
      setRequestError(null);
      return;
    }

    const resolvedJobId: string = activeJobId;

    let isCancelled = false;
    let intervalId: number | null = null;

    async function fetchStatus() {
      try {
        const response = await fetch(`/api/jobs/${resolvedJobId}/status`, {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to load desktop backend status.");
        }

        const nextSnapshot = normalizeDesktopJobStatus(payload, resolvedJobId);

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

  return (
    <div className="space-y-5">
      <ResultsPaneHeader jobId={jobId} context={context} />

      {requestError && snapshot ? (
        <div className="theme-error-banner rounded-[22px] px-4 py-3 text-sm">{requestError}</div>
      ) : null}

      {!jobId ? (
        <ResultsPaneEmpty />
      ) : requestError && !snapshot ? (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel className="p-6 sm:p-7">
            <StatusPill>Status unavailable</StatusPill>
            <h3 className="theme-text-primary mt-5 text-2xl font-semibold">Unable to reach the desktop backend bridge</h3>
            <p className="theme-text-secondary mt-4 text-sm leading-7">
              The website could not load job status for this result id. Check the bridge configuration and confirm the desktop backend is reachable.
            </p>

            <div className="theme-error-banner mt-6 rounded-[24px] px-5 py-4 text-sm">{requestError}</div>
          </Panel>

          <LogTailPanel lines={[]} emptyMessage="No backend log lines are available because the status request itself failed." />
        </div>
      ) : !snapshot ? (
        <Panel className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <LoaderCircle className="theme-text-accent h-5 w-5 animate-spin" />
            <div>
              <p className="theme-text-primary text-sm font-medium">Connecting to desktop backend</p>
              <p className="theme-text-secondary mt-1 text-sm">Loading the initial job status for `{jobId}`.</p>
            </div>
          </div>
        </Panel>
      ) : snapshot.status === "failed" ? (
        <FailedResultsView snapshot={snapshot} />
      ) : completedResult ? (
        <ResultsDashboard job={completedResult} />
      ) : (
        <PendingResultsView snapshot={snapshot} />
      )}
    </div>
  );
}
