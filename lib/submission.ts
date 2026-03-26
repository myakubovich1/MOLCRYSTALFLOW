import { createJobResult } from "@/lib/demo-data";
import type { JobResult, MoleculeSubmissionPayload } from "@/lib/types";

async function runMockSubmission(payload: MoleculeSubmissionPayload): Promise<JobResult> {
  return createJobResult({
    id: `mcf_${crypto.randomUUID().slice(0, 8)}`,
    input: payload.input,
  });
}

export async function submitMoleculeSubmission(payload: MoleculeSubmissionPayload): Promise<JobResult> {
  switch (payload.execution.target) {
    case "mock-demo":
      return runMockSubmission(payload);
    case "lab-desktop":
      // Future real-backend seam:
      // hand off the normalized payload to a local workstation adapter that
      // uploads the XYZ payload, starts a generation job, and returns a tracked job id.
      return runMockSubmission(payload);
    case "hpc-cluster":
      // Future real-backend seam:
      // hand off the same normalized payload to an HPC adapter that can queue
      // Slurm or gateway-backed jobs without changing the frontend submission contract.
      return runMockSubmission(payload);
  }
}
