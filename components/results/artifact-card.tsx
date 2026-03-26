import { Download, ExternalLink, FileArchive } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import type { ResultFile } from "@/lib/types";

interface ArtifactCardProps {
  file: ResultFile;
}

export function ArtifactCard({ file }: ArtifactCardProps) {
  return (
    <Panel className="p-5">
      <div className="flex items-start gap-4">
        <span className="theme-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <FileArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="theme-text-primary text-base font-medium">{file.name}</h3>
              <p className="theme-text-secondary mt-1 text-sm leading-6">{file.description}</p>
            </div>
            <span className="theme-chip rounded-full px-2.5 py-1 text-xs">{file.sizeLabel}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={file.href}
              target="_blank"
              rel="noreferrer"
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
            <a
              href={file.href}
              download
              className="theme-button-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition"
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      </div>
    </Panel>
  );
}
