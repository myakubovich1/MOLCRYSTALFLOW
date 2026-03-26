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
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Generated crystal structure candidates ready for review
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                MolCrystalFlow Demo accepted the uploaded conformer, staged a mock generation workflow, and returned precomputed output artifacts for
                interface and product validation.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Completed</div>
              <div className="mt-3 flex items-center gap-2 font-medium text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {job.completionState}
              </div>
              <div className="mt-2 text-slate-400">{formatTimestamp(job.receivedAt)}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Input file</p>
              <p className="mt-2 text-lg font-medium text-white">{job.originalFilename}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Formula</p>
              <p className="mt-2 text-lg font-medium text-white">{job.formula}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Atom count</p>
              <p className="mt-2 text-lg font-medium text-white">{job.atomCount}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Candidates</p>
              <p className="mt-2 text-lg font-medium text-white">{job.candidateCount}</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
              <DatabaseZap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100/70">Generation summary</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Mock result package</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{job.description}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Generation mode</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">{job.generationMode}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Z values</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">{formatZValues(job.zValues)}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Input descriptor</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">3D molecular conformer received</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Completion state</p>
              <p className="mt-2 text-sm font-medium leading-6 text-white">{job.completionState}</p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <MoleculePreview graph={job.moleculePreview} />

          <Panel className="p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-100">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Candidate preview</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Preview cards</h2>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {job.previewCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} candidate={candidate} />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-6 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-100">
                <FileBadge2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Output artifacts</p>
                <h2 className="mt-3 text-2xl font-semibold text-white">Downloadable files</h2>
              </div>
            </div>
            <div className="space-y-4">
              {job.resultFiles.map((file) => (
                <ArtifactCard key={file.name} file={file} />
              ))}
            </div>
          </Panel>

          <Panel className="border-amber-300/20 bg-amber-300/[0.06] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-amber-100/80">Scientific disclaimer</p>
            <p className="mt-4 text-sm leading-7 text-amber-50/90">{job.note}</p>
          </Panel>

          <Panel className="p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Upgrade path</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              The current route and result schema are intentionally shaped so they can later be backed by real job submission, status polling, and
              artifact retrieval from a laboratory workstation or HPC cluster.
            </p>
          </Panel>
        </div>
      </section>
    </div>
  );
}
