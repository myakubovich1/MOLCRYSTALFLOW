import { ArrowUpRight, Layers3 } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import type { CandidatePreview } from "@/lib/types";
import { accentClassName } from "@/lib/utils";

interface CandidateCardProps {
  candidate: CandidatePreview;
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <Panel className="relative overflow-hidden p-5">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClassName(candidate.accent)} opacity-90`}
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{candidate.mode}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{candidate.title}</h3>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Z value</p>
            <p className="mt-1 text-sm font-medium text-white">Z = {candidate.zValue}</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-100">
            <Layers3 className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-slate-300">{candidate.summary}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm text-slate-300">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <span>{candidate.confidenceLabel}</span>
          </div>
          <p className="mt-3 leading-6">{candidate.lattice}</p>
        </div>

        <a
          href={candidate.artifactHref}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          View candidate artifact
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </Panel>
  );
}
