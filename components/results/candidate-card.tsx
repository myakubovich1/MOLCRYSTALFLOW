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
        style={{ opacity: "var(--candidate-overlay-opacity)" }}
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="theme-text-secondary text-xs font-medium uppercase tracking-[0.24em]">{candidate.mode}</p>
            <h3 className="theme-text-primary mt-2 text-xl font-semibold">{candidate.title}</h3>
          </div>
          <div className="theme-subpanel rounded-2xl px-3 py-2 text-right">
            <p className="theme-text-muted text-[11px] uppercase tracking-[0.18em]">Z value</p>
            <p className="theme-text-primary mt-1 text-sm font-medium">Z = {candidate.zValue}</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
            <Layers3 className="h-5 w-5" />
          </span>
          <p className="theme-text-secondary text-sm leading-6">{candidate.summary}</p>
        </div>

        <div className="theme-subpanel theme-text-secondary rounded-2xl px-4 py-4 text-sm">
          <div className="theme-text-muted flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em]">
            <span>{candidate.confidenceLabel}</span>
          </div>
          <p className="mt-3 leading-6">{candidate.lattice}</p>
        </div>

        <a
          href={candidate.artifactHref}
          target="_blank"
          rel="noreferrer"
          className="theme-button-outline mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
        >
          View candidate artifact
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </Panel>
  );
}
