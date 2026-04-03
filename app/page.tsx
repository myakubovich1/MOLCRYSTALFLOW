import { StatusPill } from "@/components/ui/status-pill";

import { ComputeLimitsNote } from "@/components/generate/compute-limits-note";
import { GenerateWorkbench } from "@/components/generate/generate-workbench";
import { ResultsEmptyState } from "@/components/generate/results-empty-state";
import { AppFrame } from "@/components/ui/app-frame";

export default function HomePage() {
  return (
    <AppFrame>
      <section className="max-w-4xl">
        <StatusPill>Generate</StatusPill>
        <p className="theme-text-accent mt-6 text-sm font-medium uppercase tracking-[0.24em]">MolCrystalFlow Demo</p>
        <h1 className="theme-text-primary mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">Generate candidate crystal structures from one XYZ conformer.</h1>
        <p className="theme-text-secondary mt-5 max-w-3xl text-base leading-8 sm:text-lg">
          MolCrystalFlow is a scientific generator interface for submitting molecular conformers, tracking backend execution, and retrieving generated
          artifact files from a desktop compute service.
        </p>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <GenerateWorkbench />

        <div className="space-y-6">
          <ComputeLimitsNote />
          <ResultsEmptyState />
        </div>
      </section>
    </AppFrame>
  );
}
