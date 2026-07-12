export const workflowSteps = [
  {
    id: "file-received",
    title: "File received",
    detail: "Single molecular conformer accepted for processing.",
  },
  {
    id: "feature-extraction",
    title: "Extracting molecular features",
    detail: "Reading atom symbols, coordinates, and conformer descriptors.",
  },
  {
    id: "candidate-generation",
    title: "Generating crystal candidates",
    detail: "Generating candidate crystal packings from the submitted conformer.",
  },
  {
    id: "output-preparation",
    title: "Preparing outputs",
    detail: "Validating, ranking, and preparing accepted structures for delivery.",
  },
] as const;
