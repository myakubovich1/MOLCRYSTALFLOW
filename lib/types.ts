export type JobStatus = "queued" | "running" | "completed" | "failed";
export type InputMode = "upload-file" | "paste-xyz" | "manual-atoms";
export type SubmitInputMode = "upload" | "paste";
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
  latticeVectors?: LatticeVectors;
  latticeParameters?: LatticeParameters;
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
  kind: "bundle" | "candidate-set" | "raw-candidate-set" | "manifest";
}

export interface FilterSummary {
  generatedCount: number;
  geometryPassedCount: number;
  geometryRejectedCount: number;
  clashRejectedCount: number;
  potentialAttemptedCount: number;
  potentialFailedCount: number;
  potentialCrashRate: number;
  energyRejectedCount: number;
  acceptedCount: number;
  energyRankedCount?: number;
  preOptimizationGeometryPassedCount?: number;
  preOptimizationGeometryRejectedCount?: number;
  postOptimizationGeometryEvaluatedCount?: number;
  postOptimizationGeometryPassedCount?: number;
  postOptimizationGeometryRejectedCount?: number;
  energyRankingAvailable?: boolean;
  energyRankingUnavailableReason?: string;
  rankingMode?: string;
  potentialProvider?: string;
  potentialModel?: string;
  potentialTask?: string;
  rigidBodySteps?: number;
}

export interface GeometryFilterRecord {
  geometryPassed?: boolean;
  reasons?: string[];
  densityGcm3?: number;
  minimumIntermolecularDistanceAngstrom?: number;
  minimumVdwRatio?: number;
  minimumHeavyAtomVdwRatio?: number;
  clashCount?: number;
  periodicSelfImageClashCount?: number;
  clashRate?: number;
}

export interface CandidateFilterRecord {
  id: string;
  zValue: number;
  sourceIndex: number;
  acceptedIndex?: number;
  status: string;
  accepted: boolean;
  reasons: string[];
  densityGcm3?: number;
  minimumIntermolecularDistanceAngstrom?: number;
  minimumVdwRatio?: number;
  minimumHeavyAtomVdwRatio?: number;
  clashCount?: number;
  periodicSelfImageClashCount?: number;
  clashRate?: number;
  preOptimizationGeometry?: GeometryFilterRecord;
  postOptimizationGeometry?: GeometryFilterRecord;
  geometryStage?: string;
  rank?: number;
  energy?: number;
  energyUnits?: string;
  energyEvPerMolecule?: number;
  energyType?: string;
  relativeEnergyEvPerMolecule?: number;
  initialEnergyEvPerMolecule?: number;
  initialMaxForceEvPerAngstrom?: number;
  maxForceEvPerAngstrom?: number;
  forceKind?: string;
  potentialProvider?: string;
  potentialModel?: string;
  potentialTask?: string;
  potentialStatus?: string;
  rankingStatus?: string;
  optimized?: boolean;
  optimizationType?: string;
  optimizationSteps?: number;
  optimizationProtocol?: string;
  optimizationConverged?: boolean | null;
  scientificStatus?: string;
  scoringError?: string;
}

export interface ViewerSource {
  artifactName: string;
  label: string;
  zValue: number;
  rawText: string;
  structures: string[];
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

export type Vector3Tuple = [number, number, number];

export interface LatticeVectors {
  a: Vector3Tuple;
  b: Vector3Tuple;
  c: Vector3Tuple;
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
  generatedCandidateCount?: number;
  filterSummary?: FilterSummary;
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
  moleculePreview: MoleculePreviewGraph | null;
  logTail?: string[];
}

export interface SubmitPayload {
  xyzText: string;
  originalFilename?: string;
  inputMode: SubmitInputMode;
}

export interface SubmitJobResponse {
  jobId: string;
  status?: JobStatus;
  error?: string;
}

export interface ExampleStructure {
  index: number;
  zValue: number;
  atomCount: number;
  formula: string;
  lattice: LatticeParameters;
  xyzText: string;
  thumbnailDataUrl?: string;
}
