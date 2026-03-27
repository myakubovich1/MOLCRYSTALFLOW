import { Cpu, HardDrive, Sparkles } from "lucide-react";

import { Panel } from "@/components/ui/panel";

export function ComputeLimitsNote() {
  return (
    <Panel className="p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
          <Cpu className="h-5 w-5" />
        </span>
        <div>
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Scope and limits</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Research preview with a backend-ready contract</h2>
          <p className="theme-text-secondary mt-3 text-sm leading-7">
            This version demonstrates the MolCrystalFlow workflow using mocked execution and precomputed outputs. It is intentionally framed as a
            candidate-generation preview rather than a final scientific ranking system.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="theme-subpanel rounded-[22px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-shell flex h-10 w-10 items-center justify-center rounded-2xl">
              <HardDrive className="h-4 w-4" />
            </span>
            <div>
              <p className="theme-text-primary text-sm font-medium">Desktop or lab execution is the next real target</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                The frontend is already shaped to hand off normalized XYZ submissions to a dedicated workstation service later without a full UI
                redesign.
              </p>
            </div>
          </div>
        </div>

        <div className="theme-subpanel rounded-[22px] px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="theme-icon-shell flex h-10 w-10 items-center justify-center rounded-2xl">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="theme-text-primary text-sm font-medium">Future user generation will likely be capacity-aware</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Later self-serve runs may depend on available compute, queueing, and scheduling on the backend machine rather than unlimited
                throughput.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
