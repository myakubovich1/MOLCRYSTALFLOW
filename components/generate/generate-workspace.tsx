"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GenerationPanel } from "@/components/generate/generation-panel";
import { ResultsPane } from "@/components/results/results-pane";
import { SavedGenerationsPanel } from "@/components/results/saved-generations-panel";
import {
  clearSavedGenerations,
  readSavedGenerations,
  removeSavedGeneration,
  saveGeneration,
  SAVED_GENERATIONS_EVENT,
  type SavedGeneration,
} from "@/lib/saved-generations";
import type { JobResult } from "@/lib/types";

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
  const [savedGenerations, setSavedGenerations] = useState<SavedGeneration[]>([]);

  useEffect(() => {
    setCurrentJobId(initialJobId);
  }, [initialJobId]);

  useEffect(() => {
    function refreshSavedGenerations() {
      setSavedGenerations(readSavedGenerations());
    }

    refreshSavedGenerations();
    window.addEventListener("storage", refreshSavedGenerations);
    window.addEventListener(SAVED_GENERATIONS_EVENT, refreshSavedGenerations);

    return () => {
      window.removeEventListener("storage", refreshSavedGenerations);
      window.removeEventListener(SAVED_GENERATIONS_EVENT, refreshSavedGenerations);
    };
  }, []);

  function setActiveJob(jobId: string | null) {
    setCurrentJobId(jobId);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (jobId) {
      nextParams.set("job", jobId);
    } else {
      nextParams.delete("job");
    }

    startTransition(() => {
      router.replace(nextParams.size > 0 ? `${pathname}?${nextParams.toString()}` : pathname, { scroll: false });
    });
  }

  function handleJobCreated(jobId: string) {
    setActiveJob(jobId);
  }

  function handleReset() {
    setActiveJob(null);
  }

  function handleSaveCompletedJob(job: JobResult) {
    saveGeneration(job);
    setSavedGenerations(readSavedGenerations());
  }

  function handleRemoveSavedGeneration(jobId: string) {
    removeSavedGeneration(jobId);
    setSavedGenerations(readSavedGenerations());
  }

  function handleClearSavedGenerations() {
    clearSavedGenerations();
    setSavedGenerations([]);
  }

  const isCurrentJobSaved = currentJobId
    ? savedGenerations.some((generation) => generation.id === currentJobId)
    : false;

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
        <aside className="space-y-4 self-start lg:sticky lg:top-6">
          <GenerationPanel onJobCreated={handleJobCreated} />
          <SavedGenerationsPanel
            savedGenerations={savedGenerations}
            currentJobId={currentJobId}
            onOpen={setActiveJob}
            onRemove={handleRemoveSavedGeneration}
            onClear={handleClearSavedGenerations}
          />
        </aside>
        <section className="min-w-0">
          <ResultsPane
            jobId={currentJobId}
            context="workspace"
            onReset={currentJobId ? handleReset : undefined}
            onSaveCompletedJob={handleSaveCompletedJob}
            isJobSaved={isCurrentJobSaved}
          />
        </section>
      </div>
    </div>
  );
}
