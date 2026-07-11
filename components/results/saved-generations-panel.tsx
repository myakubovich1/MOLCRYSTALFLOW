"use client";

import { Bookmark, FolderOpen, Trash2 } from "lucide-react";

import type { SavedGeneration } from "@/lib/saved-generations";
import { formatZValues } from "@/lib/utils";

interface SavedGenerationsPanelProps {
  savedGenerations: SavedGeneration[];
  currentJobId?: string | null;
  onOpen: (jobId: string) => void;
  onRemove: (jobId: string) => void;
  onClear: () => void;
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved locally";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function SavedGenerationsPanel({
  savedGenerations,
  currentJobId,
  onOpen,
  onRemove,
  onClear,
}: SavedGenerationsPanelProps) {
  return (
    <section className="theme-subpanel-soft rounded-[20px] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="theme-text-accent h-4 w-4" />
            <h2 className="theme-text-primary text-sm font-semibold">Saved generations</h2>
          </div>
          <p className="theme-text-muted mt-1 text-xs leading-5">
            Local only in this browser. Clearing browser data removes this list.
          </p>
        </div>
        {savedGenerations.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="theme-text-muted hover:theme-text-primary rounded-full px-2 py-1 text-[11px] transition"
          >
            Clear
          </button>
        )}
      </div>

      {savedGenerations.length === 0 ? (
        <div className="theme-subpanel mt-3 rounded-2xl px-3 py-4 text-center">
          <p className="theme-text-secondary text-xs">No saved generations yet.</p>
          <p className="theme-text-muted mt-1 text-[11px]">Completed runs can be saved from the results toolbar.</p>
        </div>
      ) : (
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {savedGenerations.map((generation) => {
            const isCurrent = generation.id === currentJobId;
            const acceptedLabel =
              typeof generation.generatedCandidateCount === "number"
                ? `${generation.candidateCount}/${generation.generatedCandidateCount} accepted`
                : `${generation.candidateCount} accepted`;

            return (
              <article
                key={generation.id}
                className={`theme-subpanel rounded-2xl px-3 py-3 ${
                  isCurrent ? "ring-1 ring-[color:var(--accent)]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="theme-text-primary truncate text-sm font-semibold">{generation.formula}</p>
                    <p className="theme-text-muted mt-1 text-[11px]">
                      {acceptedLabel} · {formatZValues(generation.zValues)} · {generation.atomCount} atoms/mol
                    </p>
                    <p className="theme-text-muted mt-1 text-[11px]">{formatSavedAt(generation.savedAt)}</p>
                    {generation.potentialModel && (
                      <p className="theme-text-muted mt-1 text-[11px]">
                        Ranked with {generation.potentialModel}
                        {generation.rigidBodySteps ? ` after ${generation.rigidBodySteps} rigid-body steps` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(generation.id)}
                    aria-label={`Remove saved generation ${generation.formula}`}
                    className="theme-text-muted hover:theme-text-primary shrink-0 rounded-lg p-1 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpen(generation.id)}
                  className="theme-button-outline mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  {isCurrent ? "Viewing this run" : "Open saved run"}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
