"use client";

import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GenerationPanel } from "@/components/generate/generation-panel";
import { ResultsPane } from "@/components/results/results-pane";

interface GenerateWorkspaceProps {
  initialJobId?: string | null;
}

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
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-6 lg:grid-cols-[400px_minmax(0,1fr)] 2xl:grid-cols-[440px_minmax(0,1fr)]">
      <aside className="self-start lg:sticky lg:top-6">
        <GenerationPanel onJobCreated={handleJobCreated} />
      </aside>
      <section className="min-w-0">
        <ResultsPane jobId={currentJobId} context="workspace" />
      </section>
    </div>
  );
}
