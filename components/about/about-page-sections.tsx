import Link from "next/link";
import { ArrowRight, Cpu, FlaskConical, HardDrive, Orbit } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

export function AboutPageSections() {
  return (
    <div className="space-y-6">
      <section className="max-w-4xl">
        <StatusPill>About</StatusPill>
        <h1 className="theme-text-primary mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          MolCrystalFlow Demo is a web interface for molecular crystal candidate generation from XYZ conformers.
        </h1>
        <p className="theme-text-secondary mt-6 max-w-3xl text-base leading-8">
          The site is built as a clean generator product: submit one molecular conformer, trigger a backend job, monitor status, and retrieve
          generated `.xyz` artifact files when the run completes.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-11 w-11 items-center justify-center rounded-2xl">
              <Orbit className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Current functionality</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Submit, track, retrieve</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The current product accepts `.xyz` conformers, submits them to the backend, polls job state, and exposes generated artifact files
                through the web interface.
              </p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
              <FlaskConical className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Scientific framing</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Candidate structures only</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                Outputs are generated candidate structures for research use. They are not presented as final validated rankings or as physical proof by
                themselves.
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
                Throughput may be limited by backend machine availability, queue time, and fixed run defaults. Some advanced ranking or relaxation
                stages are outside this first integrated product.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Input</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">One XYZ conformer, submitted by upload or pasted XYZ text.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Execution</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Desktop backend accepts jobs, runs generation, and exposes artifacts.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Results</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">The UI renders status, summary metadata, files, and future viewer space.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Future</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Richer 3D viewing, better comparison tools, and stronger service stability.</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Product direction</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">What this product will do next</h2>
          <div className="mt-5 space-y-3">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">Richer in-browser 3D visualization</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                The current viewer block is intentionally reserved for a more capable structure viewer once backend outputs and frontend rendering are
                aligned.
              </p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">Better candidate comparison</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Later result iterations can compare generated candidates more directly once the backend exposes richer per-candidate metadata.
              </p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-primary text-sm font-medium">Operational hardening</p>
              <p className="theme-text-secondary mt-2 text-sm leading-6">
                Over time the service can add stronger queueing, reliability, and compute controls while the frontend surface remains stable.
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
    </div>
  );
}
