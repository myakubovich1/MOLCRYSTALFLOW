import Link from "next/link";
import { ArrowRight, Binary, FlaskConical, Workflow } from "lucide-react";

import { ComputeLimitsNote } from "@/components/generate/compute-limits-note";
import { GenerateWorkbench } from "@/components/generate/generate-workbench";
import { ResultsEmptyState } from "@/components/generate/results-empty-state";
import { AppFrame } from "@/components/ui/app-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

const architectureCards = [
  {
    title: "XYZ-centered input",
    description: "The Generate workflow is built around molecular conformers, matching the current backend reality instead of unsupported text-first chemistry input.",
    icon: Binary,
  },
  {
    title: "Mock execution now",
    description: "The current run simulates job intake, staged processing, and result packaging so the product logic can be reviewed before live integration.",
    icon: Workflow,
  },
  {
    title: "Desktop backend next",
    description: "Submission, status, and result models are already shaped so a dedicated lab machine can replace the mock layer later without a frontend reset.",
    icon: FlaskConical,
  },
] as const;

export default function HomePage() {
  return (
    <AppFrame>
      <section className="max-w-4xl">
        <StatusPill>Generate</StatusPill>
        <h1 className="theme-text-primary mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">MolCrystalFlow Demo</h1>
        <p className="theme-text-secondary mt-5 max-w-3xl text-base leading-8 sm:text-lg">
          Upload a molecular conformer to preview generated crystal structure candidates. The current experience is a research-focused prototype, but
          it is already organized around the same workflow a real desktop-backed generator will use later.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {["Upload `.xyz`", "Paste XYZ", "Manual atom entry", "Candidate structures", "Desktop backend roadmap"].map((chip) => (
            <span key={chip} className="theme-chip rounded-full px-3 py-1.5 text-xs">
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/results/demo-sample"
            className="theme-button-outline inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
          >
            Open sample result
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="/demo/sample_input.xyz" download className="theme-button-accent inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium">
            Download sample `.xyz`
          </a>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
        <GenerateWorkbench />

        <div className="space-y-6">
          <ComputeLimitsNote />
          <ResultsEmptyState />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {architectureCards.map((card) => {
          const Icon = card.icon;

          return (
            <Panel key={card.title} className="p-5">
              <span className="theme-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="theme-text-primary mt-5 text-lg font-semibold">{card.title}</h2>
              <p className="theme-text-secondary mt-3 text-sm leading-7">{card.description}</p>
            </Panel>
          );
        })}
      </section>
    </AppFrame>
  );
}
