import { BookmarkCheck, BookmarkPlus, Download, RotateCcw } from "lucide-react";

import { InteractiveStructureViewer } from "@/components/results/interactive-structure-viewer";
import type { JobResult } from "@/lib/types";
import { formatZValues } from "@/lib/utils";

interface ResultsDashboardProps {
  job: JobResult;
  onReset?: () => void;
  onSave?: (job: JobResult) => void;
  isSaved?: boolean;
}

function SummaryBar({ job }: { job: JobResult }) {
  const metrics = [
    { label: "Formula", value: job.formula },
    {
      label: "Accepted",
      value:
        typeof job.generatedCandidateCount === "number"
          ? `${job.candidateCount} / ${job.generatedCandidateCount}`
          : String(job.candidateCount),
    },
    { label: "Z values", value: formatZValues(job.zValues) },
    { label: "Atoms/mol", value: String(job.atomCount) },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex items-baseline gap-2">
          <span className="theme-text-muted text-xs">{metric.label}</span>
          <span className="theme-text-primary text-sm font-medium">{metric.value}</span>
        </div>
      ))}
    </div>
  );
}

function BulkDownloads({ job }: { job: JobResult }) {
  const combinedFile = job.resultFiles.find((f) => f.name === "pred_combined.xyz");
  const zFiles = job.resultFiles.filter(
    (f) => f.kind === "candidate-set" && /^crystals_z\d+\.xyz$/i.test(f.name),
  );
  const rawFiles = job.resultFiles.filter((f) => f.kind === "raw-candidate-set");
  const manifest = job.resultFiles.find((f) => f.kind === "manifest");

  return (
    <div className="flex flex-wrap items-center gap-2">
      {combinedFile && (
        <a
          href={combinedFile.href}
          download
          className="theme-button-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Download All (XYZ)
        </a>
      )}
      {zFiles.map((file) => (
        <a
          key={file.name}
          href={file.href}
          download
          className="theme-button-outline inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm"
        >
          <Download className="h-3.5 w-3.5" />
          {file.name}
        </a>
      ))}
      {manifest && (
        <a
          href={manifest.href}
          download
          className="theme-button-outline inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm"
        >
          <Download className="h-3.5 w-3.5" />
          Filtering report
        </a>
      )}
      {rawFiles.length > 0 && (
        <details className="relative">
          <summary className="theme-button-outline cursor-pointer list-none rounded-full px-3.5 py-2 text-sm">
            Raw outputs
          </summary>
          <div className="absolute right-0 z-20 mt-2 min-w-56 space-y-1 rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--panel-fill)] p-2 shadow-lg">
            {rawFiles.map((file) => (
              <a
                key={file.name}
                href={file.href}
                download
                className="theme-text-secondary hover:theme-text-primary block rounded-lg px-3 py-2 text-xs hover:bg-[color:var(--surface-soft)]"
              >
                {file.name}
              </a>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FilteringSummary({ job }: { job: JobResult }) {
  const summary = job.filterSummary;
  if (!summary) return null;

  const metrics = [
    ["Generated", summary.generatedCount],
    ["Geometry rejected", summary.geometryRejectedCount],
    ["Clash rejected", summary.clashRejectedCount],
    ["Potential failed", summary.potentialFailedCount],
    ["Energy ranked", summary.energyRankedCount ?? 0],
    ["Accepted", summary.acceptedCount],
  ] as const;

  return (
    <div className="theme-subpanel-soft rounded-xl p-4">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <p className="theme-text-muted text-[11px]">{label}</p>
            <p className="theme-text-primary mt-0.5 text-sm font-medium">{value}</p>
          </div>
        ))}
        {summary.potentialAttemptedCount > 0 && (
          <div>
            <p className="theme-text-muted text-[11px]">Potential crash rate</p>
            <p className="theme-text-primary mt-0.5 text-sm font-medium">
              {(summary.potentialCrashRate * 100).toFixed(1)}%
            </p>
          </div>
        )}
        {summary.rankingMode === "uma-rigid-body" && (
          <div>
            <p className="theme-text-muted text-[11px]">Ranking</p>
            <p className="theme-text-primary mt-0.5 text-sm font-medium">
              {summary.energyRankingAvailable
                ? `${summary.potentialModel ?? "UMA-s-1p2"}, ${summary.rigidBodySteps ?? 10} rigid-body steps`
                : summary.energyRankingUnavailableReason ?? "Unavailable"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultsDashboard({ job, onReset, onSave, isSaved = false }: ResultsDashboardProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SummaryBar job={job} />
        <div className="flex flex-wrap items-center gap-2">
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(job)}
              disabled={isSaved}
              title="Save this generation locally in this browser."
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm disabled:cursor-default disabled:opacity-80"
            >
              {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
              {isSaved ? "Saved locally" : "Save locally"}
            </button>
          )}
          <BulkDownloads job={job} />
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Generation
            </button>
          )}
        </div>
      </div>

      <FilteringSummary job={job} />

      <InteractiveStructureViewer
        jobId={job.id}
        formula={job.formula}
        atomCount={job.atomCount}
        resultFiles={job.resultFiles}
      />
    </div>
  );
}
