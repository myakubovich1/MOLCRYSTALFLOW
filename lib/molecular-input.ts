import type {
  AtomCoordinate,
  ExecutionTarget,
  InputMode,
  ManualAtomRow,
  MoleculeSubmissionPayload,
  NormalizedMolecularInput,
} from "@/lib/types";
import { atomCoordinatesToXyzText, buildFormula, normalizeAtomSymbol, parseXyzText } from "@/lib/xyz";

export const MAX_MOLECULAR_INPUT_BYTES = 5 * 1024 * 1024;

const defaultSourceLabels: Record<InputMode, string> = {
  "upload-file": "uploaded_input.xyz",
  "paste-xyz": "pasted_input.xyz",
  "manual-atoms": "manual_entry.xyz",
};

const defaultCommentLines: Record<InputMode, string> = {
  "upload-file": "Uploaded conformer",
  "paste-xyz": "Pasted XYZ conformer",
  "manual-atoms": "Manual atom entry",
};

type NormalizationOptions = {
  mode: InputMode;
  sourceLabel?: string;
  originalFilename?: string;
  commentLine?: string;
  fileSizeBytes?: number;
};

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function normalizeSourceLabel(mode: InputMode, sourceLabel?: string) {
  const trimmed = sourceLabel?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : defaultSourceLabels[mode];
}

function normalizeAtomCoordinates(atoms: AtomCoordinate[]) {
  const normalizedAtoms = atoms.map((atom) => {
    const symbol = normalizeAtomSymbol(atom.symbol);
    const x = Number(atom.x);
    const y = Number(atom.y);
    const z = Number(atom.z);

    if (!symbol || [x, y, z].some((value) => Number.isNaN(value))) {
      throw new Error("Each atom entry must include a valid element symbol and numeric x, y, z coordinates.");
    }

    return { symbol, x, y, z };
  });

  if (normalizedAtoms.length === 0) {
    throw new Error("At least one atom coordinate is required.");
  }

  return normalizedAtoms;
}

function coerceNumber(value: string | number, fieldLabel: string) {
  const parsedValue = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`${fieldLabel} must be numeric.`);
  }

  return parsedValue;
}

function normalizeManualRows(rows: ManualAtomRow[]) {
  const populatedRows = rows.filter((row) => {
    return [row.symbol, row.x, row.y, row.z].some((value) => String(value).trim().length > 0);
  });

  return populatedRows.map((row) => ({
    symbol: row.symbol,
    x: coerceNumber(row.x, "Manual x coordinate"),
    y: coerceNumber(row.y, "Manual y coordinate"),
    z: coerceNumber(row.z, "Manual z coordinate"),
  }));
}

export function createNormalizedInputFromAtomCoordinates(
  atoms: AtomCoordinate[],
  options: NormalizationOptions,
): NormalizedMolecularInput {
  const normalizedAtoms = normalizeAtomCoordinates(atoms);
  const commentLine = options.commentLine?.trim() || defaultCommentLines[options.mode];

  return {
    source: {
      mode: options.mode,
      sourceLabel: normalizeSourceLabel(options.mode, options.sourceLabel),
      originalFilename: options.originalFilename,
      commentLine,
      fileSizeBytes: options.fileSizeBytes,
    },
    atoms: normalizedAtoms,
    atomCount: normalizedAtoms.length,
    formula: buildFormula(normalizedAtoms),
    xyzText: atomCoordinatesToXyzText(normalizedAtoms, commentLine),
  };
}

export function createNormalizedInputFromXyzText(text: string, options: NormalizationOptions): NormalizedMolecularInput {
  if (!text.trim()) {
    throw new Error("XYZ content is empty.");
  }

  if (getUtf8ByteLength(text) > MAX_MOLECULAR_INPUT_BYTES) {
    throw new Error("Keep the molecular input under 5 MB in demo mode.");
  }

  const parsed = parseXyzText(text);

  if (!parsed.isValid || parsed.atomCount === 0) {
    throw new Error("The provided XYZ content could not be normalized into a valid molecular conformer.");
  }

  return createNormalizedInputFromAtomCoordinates(parsed.atoms, {
    ...options,
    commentLine: parsed.commentLine?.trim() || options.commentLine,
  });
}

export async function createNormalizedInputFromFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".xyz")) {
    throw new Error("Upload exactly one `.xyz` molecular conformer file.");
  }

  if (file.size === 0 || file.size > MAX_MOLECULAR_INPUT_BYTES) {
    throw new Error("Keep the uploaded conformer between 1 byte and 5 MB.");
  }

  const text = await file.text();

  return createNormalizedInputFromXyzText(text, {
    mode: "upload-file",
    sourceLabel: file.name,
    originalFilename: file.name,
    fileSizeBytes: file.size,
  });
}

export function createNormalizedInputFromPastedXyz(text: string, sourceLabel?: string) {
  return createNormalizedInputFromXyzText(text, {
    mode: "paste-xyz",
    sourceLabel,
  });
}

export function createNormalizedInputFromManualRows(rows: ManualAtomRow[], sourceLabel?: string) {
  return createNormalizedInputFromAtomCoordinates(normalizeManualRows(rows), {
    mode: "manual-atoms",
    sourceLabel,
  });
}

export function normalizedInputToXyzText(input: NormalizedMolecularInput) {
  return atomCoordinatesToXyzText(input.atoms, input.source.commentLine);
}

export function createMoleculeSubmissionPayload(
  input: NormalizedMolecularInput,
  executionTarget: ExecutionTarget = "mock-demo",
): MoleculeSubmissionPayload {
  return {
    schemaVersion: 1,
    input: {
      ...input,
      xyzText: normalizedInputToXyzText(input),
    },
    execution: {
      target: executionTarget,
      backendMode: executionTarget === "mock-demo" ? "mock" : "live",
    },
    client: {
      app: "molcrystalflow-demo",
      submittedAt: new Date().toISOString(),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInputMode(value: unknown): value is InputMode {
  return value === "upload-file" || value === "paste-xyz" || value === "manual-atoms";
}

function isExecutionTarget(value: unknown): value is ExecutionTarget {
  return value === "mock-demo" || value === "lab-desktop" || value === "hpc-cluster";
}

function atomsFromUnknown(value: unknown): AtomCoordinate[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  try {
    return normalizeAtomCoordinates(
      value.map((entry) => {
        if (!isRecord(entry)) {
          throw new Error("Invalid atom entry.");
        }

        return {
          symbol: String(entry.symbol ?? ""),
          x: Number(entry.x),
          y: Number(entry.y),
          z: Number(entry.z),
        };
      }),
    );
  } catch {
    return null;
  }
}

export function parseMoleculeSubmissionPayload(
  value: unknown,
): { success: true; payload: MoleculeSubmissionPayload } | { success: false; error: string } {
  if (!isRecord(value)) {
    return {
      success: false,
      error: "Submission payload must be a JSON object.",
    };
  }

  const inputValue = value.input;

  if (!isRecord(inputValue) || !isRecord(inputValue.source)) {
    return {
      success: false,
      error: "Submission payload is missing a normalized molecular input.",
    };
  }

  const mode = inputValue.source.mode;

  if (!isInputMode(mode)) {
    return {
      success: false,
      error: "Submission payload is missing a supported input mode.",
    };
  }

  const sourceLabel = typeof inputValue.source.sourceLabel === "string" ? inputValue.source.sourceLabel : undefined;
  const originalFilename =
    typeof inputValue.source.originalFilename === "string" ? inputValue.source.originalFilename : undefined;
  const commentLine = typeof inputValue.source.commentLine === "string" ? inputValue.source.commentLine : undefined;
  const fileSizeBytes =
    typeof inputValue.source.fileSizeBytes === "number" ? inputValue.source.fileSizeBytes : undefined;

  try {
    const normalizedInput =
      typeof inputValue.xyzText === "string" && inputValue.xyzText.trim().length > 0
        ? createNormalizedInputFromXyzText(inputValue.xyzText, {
            mode,
            sourceLabel,
            originalFilename,
            commentLine,
            fileSizeBytes,
          })
        : createNormalizedInputFromAtomCoordinates(
            atomsFromUnknown(inputValue.atoms) ?? (() => {
              throw new Error("Submission payload must include XYZ text or atom coordinates.");
            })(),
            {
              mode,
              sourceLabel,
              originalFilename,
              commentLine,
              fileSizeBytes,
            },
          );

    const executionValue = isRecord(value.execution) ? value.execution : {};
    const target = isExecutionTarget(executionValue.target) ? executionValue.target : "mock-demo";
    const submittedAt =
      isRecord(value.client) && typeof value.client.submittedAt === "string" ? value.client.submittedAt : new Date().toISOString();

    return {
      success: true,
      payload: {
        schemaVersion: 1,
        input: normalizedInput,
        execution: {
          target,
          backendMode: target === "mock-demo" ? "mock" : "live",
        },
        client: {
          app: "molcrystalflow-demo",
          submittedAt,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unable to normalize molecular submission payload.",
    };
  }
}
