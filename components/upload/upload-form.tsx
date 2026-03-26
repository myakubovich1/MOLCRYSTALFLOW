"use client";

import { startTransition, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, UploadCloud } from "lucide-react";

import { createMoleculeSubmissionPayload, createNormalizedInputFromFile, MAX_MOLECULAR_INPUT_BYTES } from "@/lib/molecular-input";
import type { SubmissionResponse } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

function isXyzFile(file: File) {
  return file.name.toLowerCase().endsWith(".xyz");
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function validateAndSetFile(file: File | null) {
    if (!file) {
      return;
    }

    if (!isXyzFile(file)) {
      setErrorMessage("Upload exactly one .xyz molecular conformer file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_MOLECULAR_INPUT_BYTES) {
      setErrorMessage("Keep the uploaded conformer under 5 MB for demo mode.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Current UI exercises the file-upload path, but paste-XYZ and manual-entry
      // screens can reuse the same normalized payload contract when they are wired in.
      const normalizedInput = await createNormalizedInputFromFile(selectedFile);
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
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Upload conformer</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Start a mock generation run</h2>
        </div>
        <span className="theme-chip rounded-full px-3 py-1 text-xs">1 file only</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            The demo accepts one geometry file, extracts lightweight molecular features, and returns precomputed candidate outputs.
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

        <div className="theme-subpanel rounded-2xl px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="theme-text-primary text-sm font-medium">Selected file</p>
              <p className="theme-text-secondary mt-1 text-sm">
                {selectedFile ? selectedFile.name : "No `.xyz` file selected yet"}
              </p>
            </div>
            <span className="theme-text-muted text-xs">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".xyz only"}
            </span>
          </div>
        </div>

        {errorMessage ? (
          <div className="theme-error-banner rounded-2xl px-4 py-3 text-sm">{errorMessage}</div>
        ) : null}

        <button
          type="submit"
          disabled={!selectedFile || isSubmitting}
          className="theme-button-primary inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-semibold transition disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating demo job..." : "Preview generated candidates"}
        </button>
      </form>

      <div className="theme-text-secondary mt-5 flex flex-wrap items-center gap-3 text-sm">
        <span>This is a prototype research preview.</span>
        <a href="/demo/sample_input.xyz" className="theme-link-accent inline-flex items-center gap-2 transition" download>
          Download sample `.xyz`
        </a>
      </div>
    </Panel>
  );
}
