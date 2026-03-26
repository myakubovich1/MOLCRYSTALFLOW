import templateJson from "@/data/demo-result.json";
import type {
  AtomCoordinate,
  CandidatePreview,
  JobResult,
  MoleculeEdge,
  MoleculeNode,
  NormalizedMolecularInput,
  ResultFile,
} from "@/lib/types";
import { createNormalizedInputFromAtomCoordinates } from "@/lib/molecular-input";

interface DemoTemplate {
  candidateBaseCount: number;
  candidateIncrement: number;
  zValues: number[];
  generationMode: string;
  completionState: string;
  description: string;
  note: string;
  resultFiles: ResultFile[];
  previewCandidates: CandidatePreview[];
}

export const workflowSteps = [
  {
    id: "file-received",
    title: "File received",
    detail: "Single molecular conformer accepted for mock processing.",
  },
  {
    id: "feature-extraction",
    title: "Extracting molecular features",
    detail: "Reading atom symbols, coordinates, and lightweight conformer descriptors.",
  },
  {
    id: "candidate-generation",
    title: "Generating crystal candidates",
    detail: "Applying demo-mode candidate generation seeded by the uploaded geometry.",
  },
  {
    id: "output-preparation",
    title: "Preparing outputs",
    detail: "Assembling artifact files and preview cards for result delivery.",
  },
] as const;

const demoTemplate = templateJson as DemoTemplate;

const sampleAtoms: AtomCoordinate[] = [
  { symbol: "C", x: -1.42, y: 0.14, z: 0.01 },
  { symbol: "C", x: -0.68, y: 1.31, z: 0.09 },
  { symbol: "O", x: 0.71, y: 1.18, z: 0.14 },
  { symbol: "C", x: 1.45, y: 0.01, z: 0.06 },
  { symbol: "N", x: 0.63, y: -1.13, z: -0.06 },
  { symbol: "C", x: -0.74, y: -1.04, z: -0.11 },
  { symbol: "H", x: -2.49, y: 0.21, z: 0.03 },
  { symbol: "H", x: -1.22, y: 2.26, z: 0.15 },
  { symbol: "H", x: 1.27, y: 2.09, z: 0.22 },
  { symbol: "H", x: 2.52, y: 0.03, z: 0.12 },
  { symbol: "H", x: 1.09, y: -2.08, z: -0.11 },
  { symbol: "H", x: -1.41, y: -1.92, z: -0.19 },
];

function colorForElement(symbol: string) {
  switch (symbol) {
    case "H":
      return "#b9c5d7";
    case "C":
      return "#8de4ff";
    case "N":
      return "#7ea9ff";
    case "O":
      return "#ffbc7d";
    case "S":
      return "#ffe17a";
    default:
      return "#72f3d8";
  }
}

function createEdges(atoms: AtomCoordinate[]) {
  const maxAtoms = Math.min(atoms.length, 14);
  const degreeCounts = new Array(maxAtoms).fill(0);
  const distances: Array<{ source: number; target: number; distance: number }> = [];

  for (let source = 0; source < maxAtoms; source += 1) {
    for (let target = source + 1; target < maxAtoms; target += 1) {
      const dx = atoms[source].x - atoms[target].x;
      const dy = atoms[source].y - atoms[target].y;
      const dz = atoms[source].z - atoms[target].z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      distances.push({ source, target, distance });
    }
  }

  distances.sort((left, right) => left.distance - right.distance);

  const edges: MoleculeEdge[] = [];

  distances.forEach(({ source, target, distance }) => {
    if (distance > 1.92) {
      return;
    }

    if (degreeCounts[source] >= 3 || degreeCounts[target] >= 3) {
      return;
    }

    degreeCounts[source] += 1;
    degreeCounts[target] += 1;

    edges.push({
      source: `node-${source}`,
      target: `node-${target}`,
      strength: Number(Math.max(0.25, 1.9 - distance).toFixed(2)),
    });
  });

  if (edges.length === 0) {
    for (let index = 0; index < maxAtoms - 1; index += 1) {
      edges.push({
        source: `node-${index}`,
        target: `node-${index + 1}`,
        strength: 0.4,
      });
    }
  }

  return edges;
}

function createMoleculePreview(atoms: AtomCoordinate[]) {
  const sampledAtoms = atoms.slice(0, Math.min(atoms.length, 14));
  const xs = sampledAtoms.map((atom) => atom.x);
  const ys = sampledAtoms.map((atom) => atom.y);
  const zs = sampledAtoms.map((atom) => atom.z);

  const xRange = Math.max(...xs) - Math.min(...xs) || 1;
  const yRange = Math.max(...ys) - Math.min(...ys) || 1;
  const zRange = Math.max(...zs) - Math.min(...zs) || 1;
  const xMid = (Math.max(...xs) + Math.min(...xs)) / 2;
  const yMid = (Math.max(...ys) + Math.min(...ys)) / 2;
  const zMid = (Math.max(...zs) + Math.min(...zs)) / 2;

  const nodes: MoleculeNode[] = sampledAtoms.map((atom, index) => {
    const xNormalized = ((atom.x - xMid) / xRange) * 42;
    const yNormalized = ((atom.y - yMid) / yRange) * 34;
    const zNormalized = (atom.z - zMid) / zRange;
    const perspective = 1 + zNormalized * 0.24;
    const isHydrogen = atom.symbol === "H";

    return {
      id: `node-${index}`,
      symbol: atom.symbol,
      x: Number((50 + xNormalized * perspective).toFixed(2)),
      y: Number((50 + yNormalized * perspective).toFixed(2)),
      depth: Number(zNormalized.toFixed(2)),
      radius: Number((isHydrogen ? 2.1 : 3.4 + Math.max(zNormalized, 0) * 0.35).toFixed(2)),
      color: colorForElement(atom.symbol),
    };
  });

  return {
    nodes,
    edges: createEdges(sampledAtoms),
  };
}

function candidateCountForAtomCount(atomCount: number) {
  const boundedAtomCount = Math.min(atomCount, 18);
  return demoTemplate.candidateBaseCount + boundedAtomCount + (atomCount % 3) * demoTemplate.candidateIncrement;
}

function buildCandidates(formula: string) {
  return demoTemplate.previewCandidates.map((candidate, index) => ({
    ...candidate,
    summary:
      index === 0
        ? `${candidate.summary} Formula-conditioned preview: ${formula}.`
        : `${candidate.summary} Retained as a research preview output for ${formula}.`,
  }));
}

export function createJobResult(input: {
  id: string;
  input: NormalizedMolecularInput;
  receivedAt?: string;
}): JobResult {
  const receivedAt = input.receivedAt ?? new Date().toISOString();

  return {
    id: input.id,
    originalFilename: input.input.source.sourceLabel,
    formula: input.input.formula,
    atomCount: input.input.atomCount,
    candidateCount: candidateCountForAtomCount(input.input.atomCount),
    zValues: demoTemplate.zValues,
    resultFiles: demoTemplate.resultFiles,
    previewCandidates: buildCandidates(input.input.formula),
    status: "completed",
    stage: "completed",
    note: demoTemplate.note,
    description: demoTemplate.description,
    generationMode: demoTemplate.generationMode,
    completionState: demoTemplate.completionState,
    receivedAt,
    moleculePreview: createMoleculePreview(input.input.atoms),
  };
}

export function getSeededDemoJob(id: string) {
  if (id !== "demo-sample") {
    return null;
  }

  return createJobResult({
    id,
    input: createNormalizedInputFromAtomCoordinates(sampleAtoms, {
      mode: "upload-file",
      sourceLabel: "sample_input.xyz",
      originalFilename: "sample_input.xyz",
      commentLine: "Seeded demo conformer",
    }),
    receivedAt: new Date("2026-03-24T15:42:00.000Z").toISOString(),
  });
}
