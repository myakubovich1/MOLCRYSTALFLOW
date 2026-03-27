import Link from "next/link";
import { ArrowRight, Binary, Cpu, FlaskConical, HardDrive, Orbit, Waypoints } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

const roadmapSteps = [
  {
    title: "Modern web frontend",
    detail: "A clear Generate workflow, stable result model, and polished scientific UI for reviewer-facing use today.",
  },
  {
    title: "Normalized XYZ input contract",
    detail: "Uploads, pasted XYZ, and manual atom rows all converge to one molecular submission payload before the API boundary.",
  },
  {
    title: "Desktop backend service",
    detail: "The first real execution target is a dedicated desktop or laboratory machine running candidate generation jobs directly.",
  },
  {
    title: "Artifact return path",
    detail: "The site is already shaped to receive generated XYZ outputs, status updates, and structured result metadata from that backend.",
  },
  {
    title: "Future 3D viewer upgrades",
    detail: "Later iterations can replace the mock viewer surface with richer in-browser structure inspection without changing the surrounding product flow.",
  },
] as const;

export function AboutPageSections() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel className="p-6 sm:p-8">
          <StatusPill>About MolCrystalFlow Demo</StatusPill>
          <h1 className="theme-text-primary mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Research-oriented product shell for molecular crystal candidate generation
          </h1>
          <p className="theme-text-secondary mt-6 max-w-3xl text-base leading-8">
            MolCrystalFlow Demo is a frontend-first interface for reviewing how users will submit molecular conformers, monitor a generation run, and
            inspect returned crystal structure candidates. The current site is a prototype, but its information architecture is already shaped around a
            real backend handoff.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {["Frontend-first prototype", "Normalized XYZ input", "Desktop backend target", "Capacity-aware rollout"].map((chip) => (
              <span key={chip} className="theme-chip rounded-full px-3 py-1.5 text-xs">
                {chip}
              </span>
            ))}
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
              <Orbit className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Current mode</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Mock-backed workflow for product validation</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The site currently uses internal mock routes and precomputed outputs. Its purpose is to validate the Generate flow, staged processing
                language, result packaging, and overall reviewer-facing credibility before live execution is connected.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Supported input today</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Upload `.xyz`, paste XYZ, or manual atom entry</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">What the output means</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Generated candidate structures for research preview</p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-6">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Backend reality</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Desktop or lab machine first</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The scientific backend has been explored independently from this UI. The expected integration path is a dedicated workstation or
                laboratory computer that can execute MolCrystalFlow jobs directly and return generated artifacts to the site.
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
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">User-facing future</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Self-serve runs with practical limits</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                Future users should be able to submit their own conformers and retrieve candidate structures through the same frontend. Availability
                will likely depend on compute capacity, scheduling, and queue time rather than unlimited throughput.
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
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Scientific honesty</p>
              <h2 className="theme-text-primary mt-3 text-xl font-semibold">Candidate structures, not final proof</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The current interface does not claim final validated ranking, experimental verification, or physical proof by itself. Results are
                framed as generated candidates for research review and product evaluation.
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell-accent flex h-12 w-12 items-center justify-center rounded-2xl">
              <Binary className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Technical roadmap</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">UI now, execution layer later</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                MolCrystalFlow Demo is being built so the frontend can mature independently while the scientific backend is connected in phases. That
                includes stable status language, a normalized input payload, and clear result packaging for returned artifacts.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {roadmapSteps.map((step, index) => (
              <div key={step.title} className="theme-subpanel rounded-[22px] px-4 py-4">
                <div className="flex items-start gap-4">
                  <span className="theme-icon-shell-accent flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="theme-text-primary text-sm font-medium">{step.title}</h3>
                    <p className="theme-text-secondary mt-2 text-sm leading-6">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="theme-icon-shell flex h-12 w-12 items-center justify-center rounded-2xl">
              <Waypoints className="h-5 w-5" />
            </span>
            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Deployment path</p>
              <h2 className="theme-text-primary mt-3 text-2xl font-semibold">From prototype shell to real execution service</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The likely sequence is: keep the frontend as the user-facing surface, connect the current mock submission route to a desktop backend
                service, return generated XYZ outputs to the site, and only later consider cluster or HPC adaptation if the workflow demands it.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Today</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Mock routes, staged workflow, result preview, and reviewer-facing framing.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Next</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Dedicated desktop or lab service receives normalized XYZ submissions and returns files.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Later</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">Optional cluster-style execution if usage volume or runtime needs justify the added complexity.</p>
            </div>
            <div className="theme-subpanel rounded-[22px] p-4">
              <p className="theme-text-muted text-xs uppercase tracking-[0.2em]">Constraint</p>
              <p className="theme-text-primary mt-2 text-sm font-medium leading-6">User generation may be limited by machine availability, scheduling, and compute budget.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="theme-button-accent inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium">
              Go to Generate
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/results/demo-sample"
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium"
            >
              Review sample result
            </Link>
          </div>
        </Panel>
      </section>
    </div>
  );
}
