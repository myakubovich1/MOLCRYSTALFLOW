import { redirect } from "next/navigation";

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

  redirect(`/results/${jobId}`);
}
