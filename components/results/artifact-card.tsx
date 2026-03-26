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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-100">
          <FileArchive className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-white">{file.name}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{file.description}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-xs text-slate-300">{file.sizeLabel}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={file.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-sm text-slate-100 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
            <a
              href={file.href}
              download
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14"
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
