import type { JobResult } from "@/lib/types";

const STORAGE_KEY = "molcrystalflow:saved-generations:v1";
const MAX_SAVED_GENERATIONS = 30;

export const SAVED_GENERATIONS_EVENT = "molcrystalflow:saved-generations-updated";

export interface SavedGeneration {
  id: string;
  formula: string;
  atomCount: number;
  candidateCount: number;
  generatedCandidateCount?: number;
  zValues: number[];
  receivedAt: string;
  savedAt: string;
  potentialModel?: string;
  rigidBodySteps?: number;
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeSavedGeneration(value: unknown): SavedGeneration | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<SavedGeneration>;

  if (
    typeof record.id !== "string" ||
    typeof record.formula !== "string" ||
    typeof record.atomCount !== "number" ||
    typeof record.candidateCount !== "number" ||
    typeof record.receivedAt !== "string" ||
    typeof record.savedAt !== "string" ||
    !Array.isArray(record.zValues)
  ) {
    return null;
  }

  return {
    id: record.id,
    formula: record.formula,
    atomCount: record.atomCount,
    candidateCount: record.candidateCount,
    generatedCandidateCount:
      typeof record.generatedCandidateCount === "number" ? record.generatedCandidateCount : undefined,
    zValues: record.zValues.filter((value): value is number => typeof value === "number"),
    receivedAt: record.receivedAt,
    savedAt: record.savedAt,
    potentialModel: typeof record.potentialModel === "string" ? record.potentialModel : undefined,
    rigidBodySteps: typeof record.rigidBodySteps === "number" ? record.rigidBodySteps : undefined,
  };
}

function writeSavedGenerations(generations: SavedGeneration[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(generations.slice(0, MAX_SAVED_GENERATIONS)));
  window.dispatchEvent(new Event(SAVED_GENERATIONS_EVENT));
}

export function readSavedGenerations(): SavedGeneration[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeSavedGeneration)
      .filter((value): value is SavedGeneration => value !== null)
      .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
      .slice(0, MAX_SAVED_GENERATIONS);
  } catch {
    return [];
  }
}

export function saveGeneration(job: JobResult): SavedGeneration {
  const savedGeneration: SavedGeneration = {
    id: job.id,
    formula: job.formula,
    atomCount: job.atomCount,
    candidateCount: job.candidateCount,
    generatedCandidateCount: job.generatedCandidateCount,
    zValues: job.zValues,
    receivedAt: job.receivedAt,
    savedAt: new Date().toISOString(),
    potentialModel: job.filterSummary?.potentialModel,
    rigidBodySteps: job.filterSummary?.rigidBodySteps,
  };

  const nextGenerations = [
    savedGeneration,
    ...readSavedGenerations().filter((generation) => generation.id !== job.id),
  ];

  writeSavedGenerations(nextGenerations);
  return savedGeneration;
}

export function removeSavedGeneration(jobId: string) {
  writeSavedGenerations(readSavedGenerations().filter((generation) => generation.id !== jobId));
}

export function clearSavedGenerations() {
  writeSavedGenerations([]);
}
