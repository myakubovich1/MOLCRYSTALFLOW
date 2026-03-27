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
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="overflow-hidden p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <StatusPill>Research preview</StatusPill>
              <h1 className="theme-text-primary mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
                Generated crystal structure candidates ready for review
              </h1>
              <p className="theme-text-secondary mt-5 max-w-2xl text-sm leading-7 sm:text-base">
                MolCrystalFlow Demo accepted the submitted conformer, staged the generator workflow, and returned a mock result package shaped like a
                future desktop-backed execution response.
              </p>
            </div>
            <div className="theme-subpanel-soft rounded-[24px] px-5 py-4 text-sm">
              <div className="theme-text-muted text-xs uppercase tracking-[0.2em]">Completed</div>
              <div className="theme-text-primary mt-3 flex items-center gap-2 font-medium">
                <CheckCircle2 className="theme-state-success-text h-4 w-4" />
                {job.completionState}
              </div>
              <div className="theme-text-secondary mt-2">{formatTimestamp(job.receivedAt)}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input file</p>
              <p className="theme-text-primary mt-2 text-lg font-medium">{job.originalFilename}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Formula</p>
              <p className="theme-text-primary mt-2 text-lg font-medium">{job.formula}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Atom count</p>
              <p className="theme-text-primary mt-2 text-lg font-medium">{job.atomCount}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidates</p>
              <p className="theme-text-primary mt-2 text-lg font-medium">{job.candidateCount}</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
              <DatabaseZap className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Generation summary</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Mock result package</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">{job.description}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Generation mode</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">{job.generationMode}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Z values</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">{formatZValues(job.zValues)}</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input descriptor</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">3D molecular conformer received</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Completion state</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">{job.completionState}</p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <MoleculePreview graph={job.moleculePreview} />

          <Panel className="p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <span className="theme-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Candidate preview</p>
                <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Crystal structure previews</h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {job.previewCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} formula={job.formula} atomCount={job.atomCount} />
              ))}
            </div>
          </Panel>
        </div>

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

          <Panel className="theme-warning-panel p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em]">Scientific disclaimer</p>
            <p className="mt-4 text-sm leading-7">{job.note}</p>
          </Panel>

          <Panel className="p-6">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Upgrade path</p>
            <p className="theme-text-secondary mt-4 text-sm leading-7">
              The current route and result schema are intentionally shaped so they can later be backed by real job submission, status polling, and
              artifact retrieval from a dedicated lab machine, with cluster-style execution remaining an optional later extension.
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}
