import { Download } from "lucide-react";

import { InteractiveStructureViewer } from "@/components/results/interactive-structure-viewer";
import type { JobResult } from "@/lib/types";
import { formatZValues } from "@/lib/utils";

interface ResultsDashboardProps {
  job: JobResult;
}

function SummaryBar({ job }: { job: JobResult }) {
  const metrics = [
    { label: "Formula", value: job.formula },
    { label: "Candidates", value: String(job.candidateCount) },
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
  const zFiles = job.resultFiles.filter((f) => /crystals_z\d+\.xyz$/i.test(f.name));

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
    </div>
  );
}

export function ResultsDashboard({ job }: ResultsDashboardProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SummaryBar job={job} />
        <BulkDownloads job={job} />
      </div>

      <InteractiveStructureViewer
        jobId={job.id}
        formula={job.formula}
        atomCount={job.atomCount}
        resultFiles={job.resultFiles}
      />

      {(job.logTail?.length ?? 0) > 0 && (
        <details className="theme-subpanel-soft rounded-xl">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium theme-text-secondary">
            Backend log
          </summary>
          <div className="border-t border-[color:var(--surface-border)] px-4 py-3">
            <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap break-words font-[family:var(--font-mono)] text-xs leading-5">
              {job.logTail?.join("\n")}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
