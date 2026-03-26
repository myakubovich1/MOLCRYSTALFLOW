import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResultsDashboard } from "@/components/results/results-dashboard";
import { AppFrame } from "@/components/ui/app-frame";
import { getSeededDemoJob } from "@/lib/demo-data";
import { getStoredJob } from "@/lib/mock-session";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { id } = await params;
  const job = (await getStoredJob(id)) ?? getSeededDemoJob(id);

  return {
    title: job ? `${job.formula} result preview` : "Result preview",
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const job = (await getStoredJob(id)) ?? getSeededDemoJob(id);

  if (!job) {
    notFound();
  }

  return (
    <AppFrame>
      <ResultsDashboard job={job} />
    </AppFrame>
  );
}
