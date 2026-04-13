"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";

import { BackendHealthIndicator } from "@/components/generate/backend-health-indicator";
import { Panel } from "@/components/ui/panel";
import { parseSubmitResponse } from "@/lib/desktop-backend";
import {
  createNormalizedInputFromFile,
  createNormalizedInputFromPastedXyz,
  MAX_MOLECULAR_INPUT_BYTES,
} from "@/lib/molecular-input";
import type { InputMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type GenerateInputMode = Extract<InputMode, "upload-file" | "paste-xyz">;

const SAMPLE_XYZ = `12
Cytosine conformer
C   -1.4200   0.1400   0.0100
C   -0.6800   1.3100   0.0900
O    0.7100   1.1800   0.1400
C    1.4500   0.0100   0.0600
N    0.6300  -1.1300  -0.0600
C   -0.7400  -1.0400  -0.1100
H   -2.4900   0.2100   0.0300
H   -1.2200   2.2600   0.1500
H    1.2700   2.0900   0.2200
H    2.5200   0.0300   0.1200
H    1.0900  -2.0800  -0.1100
H   -1.4100  -1.9200  -0.1900`;

const inputModes: Array<{ value: GenerateInputMode; label: string }> = [
  { value: "upload-file", label: "Upload .xyz" },
  { value: "paste-xyz", label: "Paste XYZ" },
];

interface GenerationPanelProps {
  onJobCreated: (jobId: string) => void;
}

function isXyzFile(file: File) {
  return file.name.toLowerCase().endsWith(".xyz");
}

export function GenerationPanel({ onJobCreated }: GenerationPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<GenerateInputMode>("upload-file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedXyz, setPastedXyz] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [numSamples, setNumSamples] = useState(20);
  const [zValues, setZValues] = useState<Set<number>>(new Set([2, 4]));

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
    setInputMode("paste-xyz");
    setPastedXyz(SAMPLE_XYZ);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;
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
          zValues: Array.from(zValues).sort(),
          numSamples,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Unable to create generation job.");
      }

      const submitResponse = parseSubmitResponse(payload);
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
          <div>
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
          <FileUp className="h-3.5 w-3.5" />
          Load example (C4H5N3O)
        </button>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="theme-text-secondary text-xs font-medium">Z values</label>
            </div>
            <div className="mt-2 flex gap-2">
              {[2, 4].map((z) => (
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
        </div>

        {errorMessage ? <div className="theme-error-banner rounded-xl px-4 py-3 text-sm">{errorMessage}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="theme-button-primary inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting..." : "Generate Structures"}
        </button>
      </form>
    </Panel>
  );
}
