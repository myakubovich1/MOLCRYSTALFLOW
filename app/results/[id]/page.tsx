import type { Metadata } from "next";

import { LiveResultsClient } from "@/components/results/live-results-client";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { AppFrame } from "@/components/ui/app-frame";
import { getSeededDemoJob } from "@/lib/demo-data";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = getSeededDemoJob(id);

  return {
    title: job ? `${job.formula} result preview` : `Result ${id}`,
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const job = getSeededDemoJob(id);

  return (
    <AppFrame>
      {job ? <ResultsDashboard job={job} /> : <LiveResultsClient jobId={id} />}
    </AppFrame>
  );
}
