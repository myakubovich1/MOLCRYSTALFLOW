"use client";

import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { FileUp, LoaderCircle, ScanText, UploadCloud } from "lucide-react";

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

const inputModes: Array<{
  value: GenerateInputMode;
  label: string;
}> = [
  {
    value: "upload-file",
    label: "Upload `.xyz`",
  },
  {
    value: "paste-xyz",
    label: "Paste XYZ",
  },
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

  function validateAndSetFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!isXyzFile(file)) {
      setErrorMessage("Upload exactly one `.xyz` molecular conformer file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_MOLECULAR_INPUT_BYTES) {
      setErrorMessage("Keep the uploaded conformer under 5 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
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
                  throw new Error("Select a `.xyz` conformer file before starting a generation run.");
                })(),
            )
          : createNormalizedInputFromPastedXyz(pastedXyz);

      const response = await fetch("/api/jobs/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xyzText: normalizedInput.xyzText,
          originalFilename: normalizedInput.source.originalFilename ?? normalizedInput.source.sourceLabel,
          inputMode: inputMode === "upload-file" ? "upload" : "paste",
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

      <div className="flex flex-wrap items-center gap-3">
        <span className="theme-chip-accent rounded-full px-3 py-1 text-xs">Generate</span>
        <BackendHealthIndicator />
        <span className="theme-chip rounded-full px-3 py-1 text-xs">XYZ input only</span>
      </div>

      <div className="mt-5">
        <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">Generate crystal structure candidates</h1>
        <p className="theme-text-secondary mt-4 text-sm leading-7">
          Submit one molecular conformer in XYZ format. The website forwards normalized coordinates to the dedicated desktop backend, then streams
          status and result files back into this workspace.
        </p>
      </div>

      <div className="theme-subpanel-soft mt-6 rounded-[24px] p-1.5">
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
                  "rounded-[18px] px-4 py-3 text-sm font-medium transition",
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

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {inputMode === "upload-file" ? (
          <div className="space-y-4">
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
                "group flex w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-5 py-10 text-center transition",
                isDragging
                  ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-muted)]",
              )}
            >
              <span className="theme-icon-shell-accent mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                {isSubmitting ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
              </span>
              <span className="theme-text-primary text-base font-medium">Drop one `.xyz` conformer here</span>
              <span className="theme-text-secondary mt-2 max-w-sm text-sm leading-6">
                Upload exactly one geometry file. This single conformer becomes the backend generation input.
              </span>
              <span className="theme-chip mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                <FileUp className="h-3.5 w-3.5" />
                Browse files
              </span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".xyz"
              className="hidden"
              onChange={(event) => validateAndSetFile(event.target.files?.[0] ?? null)}
            />

            <div className="theme-subpanel rounded-[22px] px-4 py-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Selected file</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="theme-text-primary text-sm font-medium">{selectedFile ? selectedFile.name : "No `.xyz` file selected yet"}</p>
                <span className="theme-text-secondary text-xs">{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".xyz only"}</span>
              </div>
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="theme-text-muted mb-3 block text-xs font-medium uppercase tracking-[0.2em]">XYZ coordinates</span>
            <textarea
              value={pastedXyz}
              onChange={(event) => setPastedXyz(event.target.value)}
              placeholder={`5
MolCrystalFlow conformer
C 0.000000 0.000000 0.000000
O 1.214000 0.000000 0.000000
H -0.550000 0.940000 0.000000
H -0.550000 -0.940000 0.000000
H 1.760000 0.000000 0.890000`}
              className="theme-input min-h-[20rem] w-full rounded-[26px] px-4 py-4 font-[family:var(--font-mono)] text-sm leading-7"
              spellCheck={false}
            />
          </label>
        )}

        {errorMessage ? <div className="theme-error-banner rounded-2xl px-4 py-3 text-sm">{errorMessage}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="theme-button-primary inline-flex w-full items-center justify-center rounded-[24px] px-5 py-4 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Submitting to backend..." : "Generate candidates"}
        </button>
      </form>

      <div className="theme-subpanel-soft mt-6 rounded-[24px] p-4">
        <p className="theme-text-primary text-sm font-medium">Scope and limits</p>
        <p className="theme-text-secondary mt-2 text-sm leading-7">
          Outputs are candidate molecular crystal structures generated with fixed backend defaults. Throughput depends on desktop compute
          availability, and returned artifacts are research-oriented candidates rather than final validated crystal rankings.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <a href="/demo/sample_input.xyz" className="theme-link-accent inline-flex items-center gap-2 transition" download>
            Download sample `.xyz`
          </a>
          <span className="theme-text-secondary">Upload or paste exactly one conformer per run.</span>
        </div>
      </div>
    </Panel>
  );
}
