export type JobStatus = "queued" | "processing" | "completed";

export type WorkflowStage =
  | "file-received"
  | "feature-extraction"
  | "candidate-generation"
  | "output-preparation"
  | "completed";

export interface ParsedAtom {
  symbol: string;
  x: number;
  y: number;
  z: number;
}

export interface XyzParseResult {
  atomCount: number;
  formula: string;
  atoms: ParsedAtom[];
  isValid: boolean;
  commentLine?: string;
}

export interface MoleculeNode {
  id: string;
  symbol: string;
  x: number;
  y: number;
  depth: number;
  radius: number;
  color: string;
}

export interface MoleculeEdge {
  source: string;
  target: string;
  strength: number;
}

export interface MoleculePreviewGraph {
  nodes: MoleculeNode[];
  edges: MoleculeEdge[];
}

export interface ResultFile {
  name: string;
  href: string;
  description: string;
  sizeLabel: string;
  kind: "bundle" | "candidate-set";
}

export interface CandidatePreview {
  id: string;
  title: string;
  zValue: number;
  mode: string;
  summary: string;
  lattice: string;
  confidenceLabel: string;
  artifactHref: string;
  accent: "cyan" | "violet" | "emerald" | "amber";
}

export interface JobResult {
  id: string;
  originalFilename: string;
  formula: string;
  atomCount: number;
  candidateCount: number;
  zValues: number[];
  resultFiles: ResultFile[];
  previewCandidates: CandidatePreview[];
  status: JobStatus;
  stage: WorkflowStage;
  note: string;
  description: string;
  generationMode: string;
  completionState: string;
  receivedAt: string;
  moleculePreview: MoleculePreviewGraph;
}

export interface SubmissionResponse {
  success: boolean;
  job: JobResult;
  nextUrl: string;
}
