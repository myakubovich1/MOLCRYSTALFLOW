import { CheckCircle2, DatabaseZap, FileBadge2, Sparkles } from "lucide-react";

import { ArtifactCard } from "@/components/results/artifact-card";
import { CandidateCard } from "@/components/results/candidate-card";
import { MoleculePreview } from "@/components/results/molecule-preview";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import type { JobResult } from "@/lib/types";
import { formatTimestamp, formatZValues } from "@/lib/utils";

interface ResultsDashboardProps {
  job: JobResult;
}

export function ResultsDashboard({ job }: ResultsDashboardProps) {
  const hasPreviewCandidates = job.previewCandidates.length > 0;
  const hasLogTail = (job.logTail?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <MoleculePreview graph={job.moleculePreview} />

        <Panel className="overflow-hidden p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StatusPill>Completed</StatusPill>
              <h3 className="theme-text-primary mt-5 text-2xl font-semibold">Desktop result package ready</h3>
              <p className="theme-text-secondary mt-4 text-sm leading-7">{job.description}</p>
            </div>
            <div className="theme-subpanel-soft rounded-[24px] px-5 py-4 text-sm">
              <div className="theme-text-muted text-xs uppercase tracking-[0.2em]">Completion state</div>
              <div className="theme-text-primary mt-3 flex items-center gap-2 font-medium">
                <CheckCircle2 className="theme-state-success-text h-4 w-4" />
                {job.completionState}
              </div>
              <div className="theme-text-secondary mt-2">{formatTimestamp(job.receivedAt)}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Job id</p>
              <p className="theme-text-primary mt-3 break-all text-sm font-medium leading-6">{job.id}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input file</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.originalFilename}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Formula</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.formula}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Atom count</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.atomCount}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidate count</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.candidateCount}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Z values</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{formatZValues(job.zValues)}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Status</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.status}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Generation mode</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">{job.generationMode}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input descriptor</p>
              <p className="theme-text-primary mt-3 text-sm font-medium leading-6">3D molecular conformer received</p>
            </div>
          </div>

          <div className="theme-subpanel-soft mt-5 rounded-[24px] p-4">
            <div className="flex items-start gap-4">
              <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
                <DatabaseZap className="h-5 w-5" />
              </span>
              <div>
                <p className="theme-text-primary text-sm font-medium">Research-use output</p>
                <p className="theme-text-secondary mt-2 text-sm leading-7">{job.note}</p>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel className="p-6 sm:p-7">
          <div className="mb-5 flex items-start gap-4">
            <span className="theme-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Candidate gallery</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Generated crystal candidates</h2>
            </div>
          </div>
          {hasPreviewCandidates ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {job.previewCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} formula={job.formula} atomCount={job.atomCount} />
              ))}
            </div>
          ) : (
            <div className="theme-subpanel-soft rounded-[26px] px-5 py-5">
              <p className="theme-text-primary text-sm font-medium">Artifact-level results are available, but per-candidate preview cards are not being returned yet.</p>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The current backend bridge is returning summary metrics, generated XYZ files, and recent logs. This gallery can expand once the
                desktop backend exposes richer per-candidate metadata.
              </p>
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <span className="theme-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
                <FileBadge2 className="h-5 w-5" />
              </span>
              <div>
                <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Generated artifacts</p>
                <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Downloadable result files</h2>
              </div>
            </div>
            <div className="space-y-4">
              {job.resultFiles.map((file) => (
                <ArtifactCard key={file.name} file={file} />
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Log tail</p>
            {hasLogTail ? (
              <div className="theme-subpanel-soft mt-4 rounded-[24px] p-4">
                <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-6">
                  {job.logTail?.join("\n")}
                </pre>
              </div>
            ) : (
              <p className="theme-text-secondary mt-4 text-sm leading-7">
                Recent desktop-backend log lines are not available for this result yet.
              </p>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}
