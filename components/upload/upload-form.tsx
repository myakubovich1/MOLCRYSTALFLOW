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
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100/70">Upload conformer</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Start a mock generation run</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">1 file only</span>
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
              ? "border-cyan-300/60 bg-cyan-300/10"
              : "border-white/12 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]",
          )}
        >
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            {isSubmitting ? <LoaderCircle className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}
          </span>
          <span className="text-lg font-medium text-white">Drop a `.xyz` conformer here</span>
          <span className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
            The demo accepts one geometry file, extracts lightweight molecular features, and returns precomputed candidate outputs.
          </span>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
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

        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Selected file</p>
              <p className="mt-1 text-sm text-slate-400">
                {selectedFile ? selectedFile.name : "No `.xyz` file selected yet"}
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ".xyz only"}
            </span>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div>
        ) : null}

        <button
          type="submit"
          disabled={!selectedFile || isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "Creating demo job..." : "Preview generated candidates"}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span>This is a prototype research preview.</span>
        <a href="/demo/sample_input.xyz" className="inline-flex items-center gap-2 text-cyan-200 transition hover:text-cyan-100" download>
          Download sample `.xyz`
        </a>
      </div>
    </Panel>
  );
}
