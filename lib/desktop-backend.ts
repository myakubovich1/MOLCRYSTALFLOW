import type { JobResult, JobStatus, ResultFile, SubmitInputMode, SubmitJobResponse } from "@/lib/types";

interface RecordValue {
  [key: string]: unknown;
}

export interface DesktopJobSnapshot {
  jobId: string;
  status: JobStatus;
  originalFilename?: string;
  inputMode?: SubmitInputMode;
  formula?: string;
  atomCount?: number;
  candidateCount?: number;
  zValues: number[];
  artifacts: ResultFile[];
  logTail: string[];
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function pickString(record: RecordValue, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function pickNumber(record: RecordValue, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function pickArray(record: RecordValue, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return undefined;
}

function normalizeSubmitInputMode(value: unknown): SubmitInputMode | undefined {
  if (value === "upload" || value === "paste") {
    return value;
  }

  return undefined;
}

function normalizeJobStatus(value: unknown): JobStatus {
  if (value === "queued" || value === "running" || value === "completed" || value === "failed") {
    return value;
  }

  if (value === "processing") {
    return "running";
  }

  return "queued";
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return "Size pending";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 100 ? 0 : 1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 100 ? 0 : 1)} MB`;
}

function describeArtifact(name: string) {
  const lower = name.toLowerCase();

  if (lower === "pred_combined.xyz") {
    return {
      description: "Combined candidate bundle returned by the desktop backend.",
      kind: "bundle" as const,
    };
  }

  const matchedZValue = lower.match(/z(\d+)/);

  if (matchedZValue) {
    return {
      description: `Candidate subset exported for Z = ${matchedZValue[1]} inspection.`,
      kind: "candidate-set" as const,
    };
  }

  return {
    description: "Generated artifact returned by the connected desktop backend.",
    kind: "candidate-set" as const,
  };
}

function normalizeLogTail(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trimEnd())
      .filter((entry) => entry.length > 0)
      .slice(-24);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((entry) => entry.trimEnd())
      .filter((entry) => entry.length > 0)
      .slice(-24);
  }

  return [];
}

function inferZValuesFromArtifacts(artifacts: ResultFile[]) {
  const values = artifacts
    .map((artifact) => artifact.name.match(/z(\d+)/i)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function inferCandidateCount(record: RecordValue, artifacts: ResultFile[]) {
  const explicitCandidateCount = pickNumber(record, ["candidateCount", "candidate_count", "numCandidates", "num_candidates"]);

  if (typeof explicitCandidateCount === "number") {
    return explicitCandidateCount;
  }

  const artifactNames = new Set(artifacts.map((artifact) => artifact.name.toLowerCase()));

  if (artifactNames.has("pred_combined.xyz")) {
    return 40;
  }

  const zArtifacts = Array.from(artifactNames).filter((name) => /crystals_z\d+\.xyz$/i.test(name));

  if (zArtifacts.length > 0) {
    return zArtifacts.length * 20;
  }

  return undefined;
}

function normalizeArtifacts(value: unknown, jobId: string): ResultFile[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        const name = entry.trim();

        if (!name) {
          return null;
        }

        const metadata = describeArtifact(name);

        return {
          name,
          href: `/api/jobs/${jobId}/files/${encodeURIComponent(name)}`,
          description: metadata.description,
          sizeLabel: "Size pending",
          kind: metadata.kind,
        } satisfies ResultFile;
      }

      if (!isRecord(entry)) {
        return null;
      }

      const name = pickString(entry, ["name", "filename", "fileName"]);

      if (!name) {
        return null;
      }

      const metadata = describeArtifact(name);
      const sizeBytes = pickNumber(entry, ["sizeBytes", "size_bytes", "bytes"]);
      const description = pickString(entry, ["description", "detail"]) ?? metadata.description;

      return {
        name,
        href: `/api/jobs/${jobId}/files/${encodeURIComponent(name)}`,
        description,
        sizeLabel: formatBytes(sizeBytes),
        kind: metadata.kind,
      } satisfies ResultFile;
    })
    .filter((artifact): artifact is ResultFile => artifact !== null);
}

function normalizeZValues(record: RecordValue, artifacts: ResultFile[]) {
  const rawValues = pickArray(record, ["zValues", "z_values"]);

  if (rawValues) {
    const values = rawValues
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isFinite(value));

    if (values.length > 0) {
      return values;
    }
  }

  return inferZValuesFromArtifacts(artifacts);
}

export function parseSubmitResponse(value: unknown): SubmitJobResponse {
  if (!isRecord(value)) {
    throw new Error("Desktop backend returned an invalid submit response.");
  }

  const jobId = pickString(value, ["jobId", "job_id", "id"]);

  if (!jobId) {
    throw new Error("Desktop backend did not return a job id.");
  }

  return {
    jobId,
    status: normalizeJobStatus(value.status),
    error: pickString(value, ["error", "detail", "message"]),
  };
}

export function normalizeDesktopJobStatus(value: unknown, expectedJobId: string): DesktopJobSnapshot {
  if (!isRecord(value)) {
    return {
      jobId: expectedJobId,
      status: "failed",
      zValues: [],
      artifacts: [],
      logTail: [],
      error: "Desktop backend returned an invalid status payload.",
    };
  }

  const jobId = pickString(value, ["jobId", "job_id", "id"]) ?? expectedJobId;
  const artifacts = normalizeArtifacts(value.artifacts ?? value.files ?? value.outputs, jobId);
  const logTail = normalizeLogTail(value.logTail ?? value.log_tail ?? value.logs ?? value.log);

  return {
    jobId,
    status: normalizeJobStatus(value.status ?? value.state),
    originalFilename: pickString(value, ["originalFilename", "original_filename", "filename"]),
    inputMode: normalizeSubmitInputMode(value.inputMode ?? value.input_mode),
    formula: pickString(value, ["formula", "molecularFormula", "molecular_formula"]),
    atomCount: pickNumber(value, ["atomCount", "atom_count"]),
    candidateCount: inferCandidateCount(value, artifacts),
    zValues: normalizeZValues(value, artifacts),
    artifacts,
    logTail,
    error: pickString(value, ["error", "detail", "message"]),
    createdAt: pickString(value, ["createdAt", "created_at", "submittedAt", "submitted_at"]),
    updatedAt: pickString(value, ["updatedAt", "updated_at", "completedAt", "completed_at"]),
  };
}

export function buildCompletedJobResult(snapshot: DesktopJobSnapshot): JobResult {
  return {
    id: snapshot.jobId,
    originalFilename: snapshot.originalFilename ?? "submitted_input.xyz",
    formula: snapshot.formula ?? "Pending formula",
    atomCount: snapshot.atomCount ?? 0,
    candidateCount: snapshot.candidateCount ?? 0,
    zValues: snapshot.zValues,
    resultFiles: snapshot.artifacts,
    previewCandidates: [],
    status: "completed",
    stage: "completed",
    note: "This connected backend run returns generated candidate structures for research use. It does not represent final validated crystal ranking.",
    description: "Candidate structure artifacts returned by the connected desktop backend through the website bridge.",
    generationMode: "Desktop backend execution",
    completionState: "Completed",
    receivedAt: snapshot.updatedAt ?? snapshot.createdAt ?? new Date().toISOString(),
    moleculePreview: null,
    logTail: snapshot.logTail,
  };
}
