"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Atom, LoaderCircle, UploadCloud, X } from "lucide-react";

import { BackendHealthIndicator } from "@/components/generate/backend-health-indicator";
import { Panel } from "@/components/ui/panel";
import { parseSubmitResponse } from "@/lib/desktop-backend";
import { CYTOSINE_XYZ, EXAMPLE_MOLECULE } from "@/lib/example-molecule";
import {
  canSubmitGeneration,
  DAILY_FREE_GENERATION_LIMIT,
  GENERATION_PROMO_CODE,
  readGenerationQuota,
  recordGeneration,
  remainingFreeGenerations,
  unlockGenerationPromo,
  type GenerationQuotaState,
} from "@/lib/generation-quota";
import {
  createNormalizedInputFromFile,
  createNormalizedInputFromPastedXyz,
  MAX_MOLECULAR_INPUT_BYTES,
} from "@/lib/molecular-input";
import type { InputMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseXyzText } from "@/lib/xyz";

type GenerateInputMode = Extract<InputMode, "upload-file" | "paste-xyz">;

const inputModes: Array<{ value: GenerateInputMode; label: string }> = [
  { value: "upload-file", label: "Upload .xyz" },
  { value: "paste-xyz", label: "Paste XYZ" },
];
const FALLBACK_Z_VALUES = [2, 4];

interface GenerationPanelProps {
  onJobCreated: (jobId: string) => void;
}

function isXyzFile(file: File) {
  return file.name.toLowerCase().endsWith(".xyz");
}

function normalizePositiveIntegerList(value: unknown) {
  if (!Array.isArray(value)) return [];
  const values = value.reduce<number[]>((result, entry: unknown) => {
    if (typeof entry === "number" && Number.isInteger(entry) && entry > 0) {
      result.push(entry);
    }
    return result;
  }, []);
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

export function GenerationPanel({ onJobCreated }: GenerationPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const zCapabilitiesLoadedRef = useRef(false);
  const [inputMode, setInputMode] = useState<GenerateInputMode>("upload-file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedXyz, setPastedXyz] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [numSamples, setNumSamples] = useState(20);
  const [supportedZValues, setSupportedZValues] = useState(FALLBACK_Z_VALUES);
  const [zValues, setZValues] = useState<Set<number>>(new Set(FALLBACK_Z_VALUES));
  const [geometryFiltering, setGeometryFiltering] = useState(true);
  const [clashThresholdRatio, setClashThresholdRatio] = useState(0.65);
  const [rankingAvailable, setRankingAvailable] = useState(false);
  const [rankingLabel, setRankingLabel] = useState("Checking UMA ranking status...");
  const [quota, setQuota] = useState<GenerationQuotaState>(() => ({
    date: "",
    count: 0,
    promoUnlocked: false,
  }));
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const remainingGenerations = remainingFreeGenerations(quota);
  const quotaAllowsSubmit = canSubmitGeneration(quota);
  const dailyLimitReached = quotaLoaded && !quota.promoUnlocked && remainingGenerations === 0;
  const requestedCandidateCount = zValues.size * numSamples;

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          throw new Error(typeof payload?.detail === "string" ? payload.detail : "Backend health check failed.");
        }

        const capabilities = payload?.capabilities;
        const backendSupportedZValues = normalizePositiveIntegerList(capabilities?.supportedZValues);
        const backendDefaultZValues = normalizePositiveIntegerList(capabilities?.defaultZValues).filter(
          (value) => backendSupportedZValues.includes(value),
        );
        if (backendSupportedZValues.length > 0) {
          setSupportedZValues(backendSupportedZValues);
          if (!zCapabilitiesLoadedRef.current) {
            const defaults =
              backendDefaultZValues.length > 0
                ? backendDefaultZValues
                : FALLBACK_Z_VALUES.filter((value) => backendSupportedZValues.includes(value));
            setZValues(new Set(defaults.length > 0 ? defaults : [backendSupportedZValues[0]]));
            zCapabilitiesLoadedRef.current = true;
          }
        }
        const available = capabilities?.energyRankingAvailable === true;
        const model =
          typeof capabilities?.potentialModel === "string"
            ? capabilities.potentialModel
            : "UMA-s-1p2";
        const steps =
          typeof capabilities?.rigidBodySteps === "number"
            ? capabilities.rigidBodySteps
            : 10;
        const task =
          typeof capabilities?.potentialTask === "string"
            ? capabilities.potentialTask.toUpperCase()
            : null;
        setRankingAvailable(available);
        setRankingLabel(
          available
            ? `${model}${task ? ` (${task})` : ""} active after ${steps} rigid-body optimization steps. Candidates will be ranked by energy without a cutoff.`
            : typeof capabilities?.energyRankingDetail === "string"
              ? capabilities.energyRankingDetail
              : typeof capabilities?.potentialDetail === "string"
                ? capabilities.potentialDetail
                : "UMA ranking is not available from this backend.",
        );
      } catch {
        if (!cancelled) {
          setRankingAvailable(false);
          setRankingLabel("Backend capability unavailable.");
        }
      }
    }

    void loadCapabilities();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setQuota(readGenerationQuota());
    setQuotaLoaded(true);
  }, []);

  function validateAndSetFile(file: File | null) {
    if (!file) return;

    if (!isXyzFile(file)) {
      setErrorMessage("Please upload a .xyz molecular conformer file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_MOLECULAR_INPUT_BYTES) {
      setErrorMessage("File must be under 5 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  }

  function loadExample() {
    const parsed = parseXyzText(CYTOSINE_XYZ);
    if (
      !parsed.isValid ||
      parsed.atomCount !== EXAMPLE_MOLECULE.atomCount ||
      parsed.formula !== EXAMPLE_MOLECULE.formula
    ) {
      setErrorMessage("The bundled cytosine example failed scientific validation.");
      return;
    }

    setInputMode("paste-xyz");
    setPastedXyz(CYTOSINE_XYZ);
    setErrorMessage(null);
    setSelectedFile(null);
  }

  function toggleZValue(z: number) {
    setZValues((current) => {
      const next = new Set(current);
      if (next.has(z)) {
        if (next.size > 1) next.delete(z);
      } else {
        next.add(z);
      }
      return next;
    });
  }

  function handlePromoUnlock() {
    const normalizedCode = promoCode.trim();
    if (!normalizedCode) {
      setPromoMessage("Enter a promo code.");
      return;
    }

    if (normalizedCode !== GENERATION_PROMO_CODE) {
      setPromoMessage("Promo code is not valid.");
      return;
    }

    setQuota(unlockGenerationPromo());
    setPromoCode("");
    setPromoMessage("Promo unlocked for today.");
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;
    const currentQuota = readGenerationQuota();
    setQuota(currentQuota);
    if (!canSubmitGeneration(currentQuota)) {
      setErrorMessage(`Daily free limit reached. Enter promo code to continue.`);
      return;
    }

    if (zValues.size === 0) {
      setErrorMessage("Select at least one Z value.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const normalizedInput =
        inputMode === "upload-file"
          ? await createNormalizedInputFromFile(
              selectedFile ??
                (() => {
                  throw new Error("Select a .xyz conformer file before generating.");
                })(),
            )
          : createNormalizedInputFromPastedXyz(pastedXyz);

      const response = await fetch("/api/jobs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xyzText: normalizedInput.xyzText,
          originalFilename: normalizedInput.source.originalFilename ?? normalizedInput.source.sourceLabel,
          inputMode: inputMode === "upload-file" ? "upload" : "paste",
          zValues: Array.from(zValues).sort((left, right) => left - right),
          numSamples,
          filtering: {
            geometryEnabled: geometryFiltering,
            clashThresholdRatio,
            maxClashCount: 0,
            minDensityGcm3: null,
            maxDensityGcm3: null,
            energyEnabled: false,
            maxRelativeEnergyEvPerMolecule: null,
            relaxationSteps: 0,
            relaxationFmaxEvPerAngstrom: 0.2,
            maxForceEvPerAngstrom: null,
          },
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to create generation job.");
      }

      const submitResponse = parseSubmitResponse(payload);
      setQuota(recordGeneration());
      onJobCreated(submitResponse.jobId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create generation job.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel className="relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      <div className="flex items-center gap-2">
        <h1 className="theme-text-primary text-2xl font-semibold tracking-tight">Generate crystal structures</h1>
        <BackendHealthIndicator />
      </div>
      <p className="theme-text-secondary mt-2 text-sm leading-6">
        Submit a molecular conformer and receive candidate crystal packings. Download results in XYZ format.
      </p>

      <div className="theme-subpanel-soft mt-5 rounded-[20px] p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {inputModes.map((mode) => {
            const isActive = inputMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setInputMode(mode.value);
                  setErrorMessage(null);
                }}
                className={cn(
                  "rounded-[14px] px-4 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                    : "theme-text-secondary hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text-primary)]",
                )}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {inputMode === "upload-file" ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                validateAndSetFile(event.dataTransfer.files?.[0] ?? null);
              }}
              className={cn(
                "group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-8 text-center transition",
                isDragging
                  ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-muted)]",
              )}
            >
              <span className="theme-icon-shell-accent mb-3 flex h-11 w-11 items-center justify-center rounded-xl">
                {isSubmitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              </span>
              {selectedFile ? (
                <span className="theme-text-primary text-sm font-medium">{selectedFile.name}</span>
              ) : (
                <span className="theme-text-secondary text-sm">Drop .xyz file or <span className="theme-text-accent font-medium">browse</span></span>
              )}
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setErrorMessage(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="theme-text-muted hover:theme-text-primary absolute right-3 top-3 rounded-full p-1 transition"
                aria-label="Clear file"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".xyz"
              className="hidden"
              onChange={(event) => validateAndSetFile(event.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <label className="block">
            <textarea
              value={pastedXyz}
              onChange={(event) => setPastedXyz(event.target.value)}
              placeholder={`12\nConformer comment\nC 0.000000 0.000000 0.000000\nO 1.214000 0.000000 0.000000\n...`}
              className="theme-input min-h-[14rem] w-full rounded-2xl px-4 py-3 font-[family:var(--font-mono)] text-sm leading-6"
              spellCheck={false}
            />
          </label>
        )}

        <button
          type="button"
          onClick={loadExample}
          className="theme-button-accent inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium"
        >
          <Atom className="h-3.5 w-3.5" />
          Load {EXAMPLE_MOLECULE.name.toLowerCase()} example ({EXAMPLE_MOLECULE.formula})
        </button>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="theme-text-secondary text-xs font-medium">Z values</label>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {supportedZValues.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => toggleZValue(z)}
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-medium transition",
                    zValues.has(z)
                      ? "theme-chip-accent"
                      : "theme-chip hover:bg-[color:var(--surface-muted)]",
                  )}
                >
                  Z = {z}
                </button>
              ))}
            </div>
            <p className="theme-text-muted mt-2 text-[11px] leading-4">
              {zValues.size} Z {zValues.size === 1 ? "value" : "values"} selected, producing up to{" "}
              {requestedCandidateCount} candidates before filtering.
            </p>
            {Math.max(...zValues) > 4 && (
              <p className="theme-text-muted mt-1 text-[11px] leading-4">
                Higher Z values create larger unit cells and can take longer to generate, optimize, and screen.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="theme-text-secondary text-xs font-medium">Structures per Z value</label>
              <span className="theme-text-primary text-xs font-medium">{numSamples}</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={numSamples}
              onChange={(event) => setNumSamples(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
            <div className="theme-text-muted mt-1 flex justify-between text-[10px]">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          <details className="theme-subpanel-soft rounded-2xl">
            <summary className="theme-text-secondary cursor-pointer px-4 py-3 text-xs font-medium">
              Candidate filtering
            </summary>
            <div className="space-y-4 border-t border-[color:var(--surface-border)] px-4 py-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={geometryFiltering}
                  onChange={(event) => setGeometryFiltering(event.target.checked)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="theme-text-primary block text-xs font-medium">Geometry and clash filtering</span>
                  <span className="theme-text-muted mt-1 block text-[11px] leading-4">
                    Validates the unit cell, atom and molecule counts, density bounds, and periodic intermolecular contacts.
                  </span>
                </span>
              </label>

              <div className={cn("space-y-2", !geometryFiltering && "opacity-50")}>
                <div className="flex items-center justify-between gap-3">
                  <label className="theme-text-secondary text-xs">Clash threshold</label>
                  <span className="theme-text-primary font-[family:var(--font-mono)] text-xs">
                    {clashThresholdRatio.toFixed(2)} x vdW
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={0.9}
                  step={0.05}
                  value={clashThresholdRatio}
                  disabled={!geometryFiltering}
                  onChange={(event) => setClashThresholdRatio(Number(event.target.value))}
                  className="w-full accent-[var(--accent)] disabled:cursor-not-allowed"
                />
              </div>

              <div className={cn("rounded-xl border px-3 py-3", rankingAvailable ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]" : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)]")}>
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 rounded-full",
                      rankingAvailable ? "bg-emerald-500" : "bg-amber-500",
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="theme-text-primary block text-xs font-medium">UMA energy ranking</span>
                    <span className="theme-text-muted mt-1 block text-[11px] leading-4">
                      {rankingLabel}
                    </span>
                    {rankingAvailable && (
                      <span className="theme-text-muted mt-1 block text-[11px] leading-4">
                        Geometry and clash filtering still run first. Ranking sorts accepted candidates; it does not reject by energy cutoff.
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </details>
        </div>

        <div className="theme-subpanel-soft rounded-2xl px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="theme-text-primary text-xs font-medium">Daily generation limit</p>
              <p className="theme-text-muted mt-1 text-[11px] leading-4">
                {quota.promoUnlocked
                  ? "Promo unlocked for today. Extra generations are enabled on this browser."
                  : `${Math.min(quota.count, DAILY_FREE_GENERATION_LIMIT)} / ${DAILY_FREE_GENERATION_LIMIT} free generations used today.`}
              </p>
            </div>
            {!quota.promoUnlocked && (
              <span className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                dailyLimitReached ? "theme-error-banner" : "theme-chip",
              )}>
                {remainingGenerations} left
              </span>
            )}
          </div>

          {!quota.promoUnlocked && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(event) => {
                  setPromoCode(event.target.value);
                  setPromoMessage(null);
                }}
                placeholder="Promo code"
                className="theme-input min-w-0 flex-1 rounded-xl px-3 py-2 text-xs"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={handlePromoUnlock}
                className="theme-button-accent rounded-xl px-3 py-2 text-xs font-medium"
              >
                Apply
              </button>
            </div>
          )}
          {promoMessage ? (
            <p className={cn(
              "mt-2 text-[11px]",
              quota.promoUnlocked ? "theme-text-accent" : "theme-text-muted",
            )}>
              {promoMessage}
            </p>
          ) : null}
        </div>

        {errorMessage ? <div className="theme-error-banner rounded-xl px-4 py-3 text-sm">{errorMessage}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting || !quotaAllowsSubmit}
          className="theme-button-primary inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : dailyLimitReached ? "Daily Limit Reached" : "Generate Structures"}
        </button>
      </form>
    </Panel>
  );
}
