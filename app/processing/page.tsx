import { redirect } from "next/navigation";

import { AppFrame } from "@/components/ui/app-frame";
import { ProcessingFlow } from "@/components/workflow/processing-flow";
import { getStoredJob } from "@/lib/mock-session";

interface ProcessingPageProps {
  searchParams: Promise<{
    job?: string;
  }>;
}

export default async function ProcessingPage({ searchParams }: ProcessingPageProps) {
  const { job: jobId } = await searchParams;

  if (!jobId) {
    redirect("/");
  }

  const job = await getStoredJob(jobId);

  if (!job) {
    redirect("/");
  }

  return (
    <AppFrame>
      <ProcessingFlow job={job} />
    </AppFrame>
  );
}
