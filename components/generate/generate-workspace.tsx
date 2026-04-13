"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GenerationPanel } from "@/components/generate/generation-panel";
import { ResultsPane } from "@/components/results/results-pane";

interface GenerateWorkspaceProps {
  initialJobId?: string | null;
}

const pipelineSteps = [
  "Conformer Input",
  "Crystal Packing",
  "Candidate Structures",
  "Download",
] as const;

export function GenerateWorkspace({ initialJobId = null }: GenerateWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId);

  useEffect(() => {
    setCurrentJobId(initialJobId);
  }, [initialJobId]);

  function handleJobCreated(jobId: string) {
    setCurrentJobId(jobId);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("job", jobId);

    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  }

  return (
    <div>
      <div className="mb-6">
        <p className="theme-text-secondary text-sm">
          Predict candidate crystal packings from a molecular conformer. Downloads available in XYZ format.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pipelineSteps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              {index > 0 && <span className="theme-text-muted text-xs">&#8594;</span>}
              <span className="theme-chip rounded-full px-3 py-1 text-xs font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-12rem)] gap-6 lg:grid-cols-[380px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="self-start lg:sticky lg:top-6">
          <GenerationPanel onJobCreated={handleJobCreated} />
        </aside>
        <section className="min-w-0">
          <ResultsPane jobId={currentJobId} context="workspace" />
        </section>
      </div>
    </div>
  );
}
