import { Cpu } from "lucide-react";

import { Panel } from "@/components/ui/panel";

export function ComputeLimitsNote() {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
          <Cpu className="h-5 w-5" />
        </span>
        <div>
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Usage note</p>
          <h2 className="theme-text-primary mt-3 text-xl font-semibold">Candidate-generation workflow</h2>
          <ul className="theme-text-secondary mt-3 space-y-2 text-sm leading-7">
            <li>Outputs are candidate crystal structures, not final validated rankings.</li>
            <li>The backend runs with controlled defaults on a dedicated desktop machine.</li>
            <li>Throughput may depend on compute availability and queue time.</li>
            <li>The current viewer surface is a placeholder for richer 3D inspection later.</li>
          </ul>
        </div>
      </div>
    </Panel>
  );
}
