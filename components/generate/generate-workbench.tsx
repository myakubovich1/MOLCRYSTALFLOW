"use client";

import { startTransition, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, ScanText, UploadCloud } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { parseSubmitResponse } from "@/lib/desktop-backend";
import { cn } from "@/lib/utils";
import {
  createNormalizedInputFromFile,
  createNormalizedInputFromPastedXyz,
  MAX_MOLECULAR_INPUT_BYTES,
} from "@/lib/molecular-input";
import type { InputMode } from "@/lib/types";

type GenerateInputMode = Extract<InputMode, "upload-file" | "paste-xyz">;

const inputModes: Array<{
  value: GenerateInputMode;
  label: string;
  description: string;
  icon: typeof UploadCloud;
}> = [
  {
    value: "upload-file",
    label: "Upload `.xyz`",
    description: "Provide one molecular conformer file from disk.",
    icon: UploadCloud,
  },
  {
    value: "paste-xyz",
    label: "Paste XYZ",
    description: "Paste raw XYZ coordinates directly into the generator.",
    icon: ScanText,
  },
] as const;

function isXyzFile(file: File) {
  return file.name.toLowerCase().endsWith(".xyz");
}

export function GenerateWorkbench() {
  const router = useRouter();
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

      startTransition(() => {
        router.push(`/results/${submitResponse.jobId}`);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create generation job.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  }

  return (
    <Panel className="relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Generator</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Submit one XYZ conformer</h2>
          <p className="theme-text-secondary mt-3 max-w-2xl text-sm leading-7">
            Upload a file or paste XYZ text. The frontend validates the input, normalizes it to `xyzText`, and sends it to the desktop backend
            through the server-side bridge.
          </p>
        </div>
        <span className="theme-chip rounded-full px-3 py-1 text-xs">XYZ only</span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {inputModes.map((mode) => {
          const Icon = mode.icon;
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
                "rounded-[22px] border px-4 py-4 text-left transition",
                isActive
                  ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] shadow-[0_0_40px_var(--accent-shadow)]"
                  : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-muted)]",
              )}
            >
              <span className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-2xl", isActive ? "theme-icon-shell-accent" : "theme-icon-shell")}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="theme-text-primary text-sm font-medium">{mode.label}</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">{mode.description}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
                "group flex w-full flex-col items-center justify-center rounded-[26px] border border-dashed px-5 py-11 text-center transition",
                isDragging
                  ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--surface-border)] bg-[color:var(--surface-soft)] hover:border-[color:var(--surface-border-strong)] hover:bg-[color:var(--surface-muted)]",
              )}
            >
              <span className="theme-icon-shell-accent mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                {isSubmitting ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
              </span>
              <span className="theme-text-primary text-lg font-medium">Drop a `.xyz` conformer here</span>
              <span className="theme-text-secondary mt-2 max-w-sm text-sm leading-6">
                Upload exactly one geometry file. The backend uses this single conformer as the generation input.
              </span>
              <span className="theme-chip mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
                <FileUp className="h-3.5 w-3.5" />
                Click to browse
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="theme-text-primary text-sm font-medium">Selected file</p>
                  <p className="theme-text-secondary mt-1 text-sm">{selectedFile ? selectedFile.name : "No `.xyz` file selected yet"}</p>
                </div>
                <span className="theme-text-muted text-xs">{selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".xyz only"}</span>
              </div>
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="theme-text-primary mb-3 block text-sm font-medium">Paste XYZ coordinates</span>
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
              className="theme-input min-h-[18rem] w-full rounded-[26px] px-4 py-4 font-[family:var(--font-mono)] text-sm leading-7"
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

      <div className="theme-text-secondary mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span>Supported today: upload `.xyz` or paste XYZ text.</span>
        <a href="/demo/sample_input.xyz" className="theme-link-accent inline-flex items-center gap-2 transition" download>
          Download sample `.xyz`
        </a>
      </div>
    </Panel>
  );
}
