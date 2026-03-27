export type JobStatus = "queued" | "processing" | "completed";
export type InputMode = "upload-file" | "paste-xyz" | "manual-atoms";
export type ExecutionTarget = "mock-demo" | "lab-desktop" | "hpc-cluster";
export type BackendMode = "mock" | "live";

export type WorkflowStage =
  | "file-received"
  | "feature-extraction"
  | "candidate-generation"
  | "output-preparation"
  | "completed";

export interface AtomCoordinate {
  symbol: string;
  x: number;
  y: number;
  z: number;
}

export type ParsedAtom = AtomCoordinate;

export interface ManualAtomRow {
  id?: string;
  symbol: string;
  x: string | number;
  y: string | number;
  z: string | number;
}

export interface XyzParseResult {
  atomCount: number;
  formula: string;
  atoms: ParsedAtom[];
  isValid: boolean;
  commentLine?: string;
}

export interface NormalizedInputSource {
  mode: InputMode;
  sourceLabel: string;
  originalFilename?: string;
  commentLine?: string;
  fileSizeBytes?: number;
}

export interface NormalizedMolecularInput {
  source: NormalizedInputSource;
  atoms: AtomCoordinate[];
  atomCount: number;
  formula: string;
  xyzText: string;
}

export interface MoleculeSubmissionPayload {
  schemaVersion: 1;
  input: NormalizedMolecularInput;
  execution: {
    target: ExecutionTarget;
    backendMode: BackendMode;
  };
  client: {
    app: "molcrystalflow-demo";
    submittedAt: string;
  };
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

export interface LatticeParameters {
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
  volume: number;
}

export interface CandidatePreview {
  id: string;
  title: string;
  zValue: number;
  mode: string;
  summary: string;
  lattice: string;
  latticeParameters: LatticeParameters;
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
