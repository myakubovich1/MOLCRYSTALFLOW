import Link from "next/link";
import { ArrowUpRight, Boxes, FileArchive, Orbit } from "lucide-react";

import { Panel } from "@/components/ui/panel";

export function ResultsEmptyState() {
  return (
    <Panel className="p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="theme-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
          <Boxes className="h-5 w-5" />
        </span>
        <div>
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Results area</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">No structures generated yet</h2>
          <p className="theme-text-secondary mt-3 text-sm leading-7">
            Submit a conformer from any supported input mode to populate this workflow with summary metrics, generated candidate files, and preview
            cards.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="theme-subpanel rounded-[22px] p-4">
          <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidate count</p>
          <p className="theme-text-primary mt-3 text-3xl font-semibold">0</p>
          <p className="theme-text-secondary mt-2 text-sm">Will populate after the mock generation route completes.</p>
        </div>
        <div className="theme-subpanel rounded-[22px] p-4">
          <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Z values</p>
          <p className="theme-text-primary mt-3 text-3xl font-semibold">Pending</p>
          <p className="theme-text-secondary mt-2 text-sm">Returned with the generated artifact bundle and preview cards.</p>
        </div>
      </div>

      <div className="theme-subpanel-soft mt-4 rounded-[26px] p-5">
        <div className="flex items-start gap-4">
          <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
            <Orbit className="h-5 w-5" />
          </span>
          <div>
            <p className="theme-text-primary text-sm font-medium">Viewer block reserved for structure inspection</p>
            <p className="theme-text-secondary mt-2 text-sm leading-6">
              This surface is where a future interactive 3D viewer can live once the real desktop backend is returning structure files directly to the
              site.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[24px] border border-dashed border-[color:var(--surface-border-strong)] bg-[color:var(--surface-muted)] p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="theme-subpanel rounded-[20px] px-4 py-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input summary</p>
            </div>
            <div className="theme-subpanel rounded-[20px] px-4 py-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Generated files</p>
            </div>
            <div className="theme-subpanel rounded-[20px] px-4 py-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Candidate gallery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/results/demo-sample"
          className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium"
        >
          Open sample result
          <ArrowUpRight className="h-4 w-4" />
        </Link>
        <a href="/demo/pred_combined.xyz" download className="theme-button-accent inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium">
          <FileArchive className="h-4 w-4" />
          Download demo artifact
        </a>
      </div>
    </Panel>
  );
}
