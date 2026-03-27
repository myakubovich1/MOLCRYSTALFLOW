"use client";

import { startTransition, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Binary,
  FileUp,
  LoaderCircle,
  Plus,
  Rows3,
  ScanText,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";
import {
  createMoleculeSubmissionPayload,
  createNormalizedInputFromFile,
  createNormalizedInputFromManualRows,
  createNormalizedInputFromPastedXyz,
  MAX_MOLECULAR_INPUT_BYTES,
} from "@/lib/molecular-input";
import type { InputMode, ManualAtomRow, SubmissionResponse } from "@/lib/types";

const inputModes: Array<{
  value: InputMode;
  label: string;
  description: string;
  icon: typeof UploadCloud;
}> = [
  {
    value: "upload-file",
    label: "Upload `.xyz`",
    description: "Use a single molecular conformer file from disk.",
    icon: UploadCloud,
  },
  {
    value: "paste-xyz",
    label: "Paste XYZ",
    description: "Paste XYZ coordinates directly into the form.",
    icon: ScanText,
  },
  {
    value: "manual-atoms",
    label: "Manual entry",
    description: "Enter atom symbols and coordinates row by row.",
    icon: Rows3,
  },
] as const;

function createManualRows(count = 4): ManualAtomRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    symbol: "",
    x: "",
    y: "",
    z: "",
  }));
}

function isXyzFile(file: File) {
  return file.name.toLowerCase().endsWith(".xyz");
}

export function GenerateWorkbench() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("upload-file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedXyz, setPastedXyz] = useState("");
  const [manualRows, setManualRows] = useState<ManualAtomRow[]>(createManualRows());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function setMode(mode: InputMode) {
    setInputMode(mode);
    setErrorMessage(null);
  }

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
      setErrorMessage("Keep the uploaded conformer under 5 MB in demo mode.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  }

  function updateManualRow(id: string | undefined, field: keyof ManualAtomRow, value: string) {
    setManualRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    );
  }

  function addManualRow() {
    setManualRows((current) => [
      ...current,
      {
        id: `row-${current.length + 1}-${crypto.randomUUID().slice(0, 6)}`,
        symbol: "",
        x: "",
        y: "",
        z: "",
      },
    ]);
  }

  function removeManualRow(id: string | undefined) {
    setManualRows((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((row) => row.id !== id);
    });
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
          : inputMode === "paste-xyz"
            ? createNormalizedInputFromPastedXyz(pastedXyz)
            : createNormalizedInputFromManualRows(manualRows);

      const submissionPayload = createMoleculeSubmissionPayload(normalizedInput);
      const response = await fetch("/api/mock-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      });

      const payload = (await response.json()) as SubmissionResponse & { error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Unable to create mock job.");
      }

      startTransition(() => {
        router.push(payload.nextUrl);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create mock job.";
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  }

  return (
    <Panel className="relative overflow-hidden p-6 sm:p-7">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Generate</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Prepare a molecular conformer submission</h2>
          <p className="theme-text-secondary mt-3 max-w-2xl text-sm leading-7">
            Version 1 accepts XYZ-style molecular input only. Every mode below normalizes to the same backend-ready submission contract before the
            mock route is called.
          </p>
        </div>
        <span className="theme-chip rounded-full px-3 py-1 text-xs">3 input modes</span>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {inputModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = inputMode === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setMode(mode.value)}
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
                Upload exactly one geometry file. The frontend stores it long enough to simulate feature extraction and candidate generation.
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
                <span className="theme-text-muted text-xs">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".xyz only"}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {inputMode === "paste-xyz" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="theme-text-primary mb-3 block text-sm font-medium">Paste XYZ coordinates</span>
              <textarea
                value={pastedXyz}
                onChange={(event) => setPastedXyz(event.target.value)}
                placeholder={`5
MolCrystalFlow demo conformer
C 0.000000 0.000000 0.000000
O 1.214000 0.000000 0.000000
H -0.550000 0.940000 0.000000
H -0.550000 -0.940000 0.000000
H 1.760000 0.000000 0.890000`}
                className="theme-input min-h-[18rem] w-full rounded-[26px] px-4 py-4 font-[family:var(--font-mono)] text-sm leading-7"
                spellCheck={false}
              />
            </label>
            <div className="theme-subpanel rounded-[22px] px-4 py-4">
              <p className="theme-text-primary text-sm font-medium">Normalization target</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Pasted coordinates are parsed into the same atom-coordinate payload used by file uploads and future desktop backend requests.
              </p>
            </div>
          </div>
        ) : null}

        {inputMode === "manual-atoms" ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="theme-text-primary text-sm font-medium">Manual atom coordinates</p>
                <p className="theme-text-secondary mt-1 text-sm">Enter element symbols and x, y, z coordinates for a single conformer.</p>
              </div>
              <button
                type="button"
                onClick={addManualRow}
                className="theme-button-outline inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                Add row
              </button>
            </div>

            <div className="space-y-3">
              {manualRows.map((row, index) => (
                <div key={row.id} className="theme-subpanel rounded-[24px] p-3">
                  <div className="grid gap-3 md:grid-cols-[0.8fr_1fr_1fr_1fr_auto]">
                    <label className="block">
                      <span className="theme-text-muted mb-2 block text-xs uppercase tracking-[0.18em]">Atom</span>
                      <input
                        value={String(row.symbol)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateManualRow(row.id, "symbol", event.target.value)}
                        placeholder={index === 0 ? "C" : "H"}
                        className="theme-input w-full rounded-[18px] px-3 py-3 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="theme-text-muted mb-2 block text-xs uppercase tracking-[0.18em]">x</span>
                      <input
                        value={String(row.x)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateManualRow(row.id, "x", event.target.value)}
                        placeholder="0.000"
                        className="theme-input w-full rounded-[18px] px-3 py-3 text-sm font-[family:var(--font-mono)]"
                      />
                    </label>
                    <label className="block">
                      <span className="theme-text-muted mb-2 block text-xs uppercase tracking-[0.18em]">y</span>
                      <input
                        value={String(row.y)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateManualRow(row.id, "y", event.target.value)}
                        placeholder="0.000"
                        className="theme-input w-full rounded-[18px] px-3 py-3 text-sm font-[family:var(--font-mono)]"
                      />
                    </label>
                    <label className="block">
                      <span className="theme-text-muted mb-2 block text-xs uppercase tracking-[0.18em]">z</span>
                      <input
                        value={String(row.z)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => updateManualRow(row.id, "z", event.target.value)}
                        placeholder="0.000"
                        className="theme-input w-full rounded-[18px] px-3 py-3 text-sm font-[family:var(--font-mono)]"
                      />
                    </label>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeManualRow(row.id)}
                        disabled={manualRows.length <= 1}
                        className="theme-button-outline inline-flex h-[46px] w-[46px] items-center justify-center rounded-[18px] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Remove atom row ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="theme-subpanel rounded-[22px] px-4 py-4">
              <p className="theme-text-primary text-sm font-medium">Manual entry behavior</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Blank rows are ignored. Populated rows are normalized into the same XYZ-backed submission contract used by the other input modes.
              </p>
            </div>
          </div>
        ) : null}

        {errorMessage ? <div className="theme-error-banner rounded-2xl px-4 py-3 text-sm">{errorMessage}</div> : null}

        <div className="theme-subpanel-soft rounded-[24px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-shell flex h-10 w-10 items-center justify-center rounded-2xl">
              <Binary className="h-4 w-4" />
            </span>
            <div>
              <p className="theme-text-primary text-sm font-medium">Mock submission contract</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                The selected input is normalized first, then posted to the mock API as a backend-ready molecular submission payload. Future desktop
                execution can consume the same contract.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="theme-button-primary inline-flex w-full items-center justify-center rounded-[24px] px-5 py-4 text-sm font-semibold disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating demo job..." : "Preview generated candidates"}
        </button>
      </form>

      <div className="theme-text-secondary mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span>Supported in version 1: upload `.xyz`, paste XYZ, or manual atom entry.</span>
        <a href="/demo/sample_input.xyz" className="theme-link-accent inline-flex items-center gap-2 transition" download>
          Download sample `.xyz`
        </a>
      </div>
    </Panel>
  );
}
