import { GenerateWorkspace } from "@/components/generate/generate-workspace";
import { AppFrame } from "@/components/ui/app-frame";

interface HomePageProps {
  searchParams: Promise<{
    job?: string | string[];
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialJobId = Array.isArray(resolvedSearchParams.job) ? resolvedSearchParams.job[0] : resolvedSearchParams.job;

  return (
    <AppFrame wide>
      <GenerateWorkspace initialJobId={initialJobId ?? null} />
    </AppFrame>
  );
}
