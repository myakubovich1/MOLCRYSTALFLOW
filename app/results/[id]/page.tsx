import type { Metadata } from "next";

import { ResultsPane } from "@/components/results/results-pane";
import { AppFrame } from "@/components/ui/app-frame";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Result ${id}`,
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;

  return (
    <AppFrame wide>
      <ResultsPane jobId={id} context="detail" />
    </AppFrame>
  );
}
