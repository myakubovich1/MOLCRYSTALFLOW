import Link from "next/link";
import { ArrowRight, Cpu, FlaskConical, HardDrive, Orbit } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

export function AboutPageSections() {
  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <StatusPill>About</StatusPill>
        <h1 className="theme-text-primary mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          MolCrystalFlow Demo is a web interface for molecular crystal candidate generation from XYZ conformers.
        </h1>
        <p className="theme-text-secondary mt-6 max-w-3xl text-base leading-8">
          The product is intentionally simple: submit one molecular conformer, trigger a backend job on a dedicated desktop machine, monitor the run,
          and retrieve generated `.xyz` artifact files when the job completes.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
              <Orbit className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Current product</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Submit, monitor, and retrieve</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The current interface accepts `.xyz` conformers by upload or pasted XYZ text, submits them through Next.js route handlers, polls job
                state, and exposes returned artifact files through the web app.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">One XYZ conformer per run, submitted by upload or pasted XYZ text.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Output</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Generated XYZ artifact bundles plus summary metadata and backend logs.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Scientific framing</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Outputs are candidate crystal structures for research review, not final validated rankings.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Operational limits</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Throughput depends on workstation availability, queue time, and current backend defaults.</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Backend architecture</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Stable frontend, dedicated desktop backend</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The frontend runs as a Next.js web app. Server-side route handlers proxy requests to a dedicated desktop machine that executes
                MolCrystalFlow and returns job status plus generated `.xyz` files. The browser never talks to the desktop service directly.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">Current generation path</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                The integrated product already submits jobs to a real backend and returns real artifact files instead of relying on a mock execution path.
              </p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">What remains outside scope</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Advanced ranking, relaxation, richer per-candidate metadata, and mature in-browser 3D inspection remain later extensions rather than
                promises of the current interface.
              </p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">Next product steps</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Over time the service can add stronger queueing, reliability controls, richer viewer integration, and better candidate comparison while
                the frontend surface remains stable.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link href="/" className="theme-button-accent inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium">
              Go to Generate
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Scientific honesty</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Candidate structures only</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The site presents generated crystal candidates for research inspection. It does not claim final validated crystal ranking or physical
                proof by itself.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
              <Cpu className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Operational limits</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Compute availability matters</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                Real generation can take time and may be constrained by machine availability, queue time, and the chosen backend defaults.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Future direction</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">More capable inspection tools</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                Future iterations can add richer 3D viewing, better candidate comparison, and stronger backend operations without replacing the
                current product shell.
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
