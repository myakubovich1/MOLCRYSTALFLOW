"use client";

const STORAGE_KEY = "molcrystalflow:generation-quota:v1";
const DEFAULT_DAILY_LIMIT = 20;
const DEFAULT_PROMO_CODE = "Qetu123!";

export interface GenerationQuotaState {
  date: string;
  count: number;
  promoUnlocked: boolean;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const DAILY_FREE_GENERATION_LIMIT = parsePositiveInteger(
  process.env.NEXT_PUBLIC_DAILY_FREE_GENERATION_LIMIT,
  DEFAULT_DAILY_LIMIT,
);

export const GENERATION_PROMO_CODE =
  process.env.NEXT_PUBLIC_GENERATION_PROMO_CODE?.trim() || DEFAULT_PROMO_CODE;

export function todayQuotaDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultQuotaState(): GenerationQuotaState {
  return {
    date: todayQuotaDate(),
    count: 0,
    promoUnlocked: false,
  };
}

function normalizeQuotaState(value: Partial<GenerationQuotaState> | null): GenerationQuotaState {
  const today = todayQuotaDate();
  if (!value || value.date !== today) {
    return defaultQuotaState();
  }

  return {
    date: today,
    count: Math.max(0, Number.isFinite(value.count) ? Number(value.count) : 0),
    promoUnlocked: value.promoUnlocked === true,
  };
}

export function readGenerationQuota(): GenerationQuotaState {
  if (typeof window === "undefined") return defaultQuotaState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultQuotaState();
    return normalizeQuotaState(JSON.parse(raw) as Partial<GenerationQuotaState>);
  } catch {
    return defaultQuotaState();
  }
}

export function saveGenerationQuota(state: GenerationQuotaState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeQuotaState(state)));
  } catch {
    // Storage failures should not block a scientific run.
  }
}

export function recordGeneration() {
  const current = readGenerationQuota();
  const next = {
    ...current,
    count: current.count + 1,
  };
  saveGenerationQuota(next);
  return next;
}

export function unlockGenerationPromo() {
  const current = readGenerationQuota();
  const next = {
    ...current,
    promoUnlocked: true,
  };
  saveGenerationQuota(next);
  return next;
}

export function remainingFreeGenerations(state: GenerationQuotaState) {
  return Math.max(0, DAILY_FREE_GENERATION_LIMIT - state.count);
}

export function canSubmitGeneration(state: GenerationQuotaState) {
  return state.promoUnlocked || remainingFreeGenerations(state) > 0;
}
