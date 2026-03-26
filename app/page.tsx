import Link from "next/link";
import { ArrowRight, Binary, FlaskConical, Workflow } from "lucide-react";

import { LandingInfoSections } from "@/components/home/landing-info-sections";
import { AppFrame } from "@/components/ui/app-frame";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { UploadForm } from "@/components/upload/upload-form";

const architectureCards = [
  {
    title: "Single `.xyz` input",
    description: "Version 1 accepts one molecular conformer file, matching the current backend reality and avoiding unsupported free-text inputs.",
    icon: Binary,
  },
  {
    title: "Mock processing flow",
    description: "The pipeline simulates file intake, feature extraction, candidate generation, and output preparation with believable timing.",
    icon: Workflow,
  },
  {
    title: "Backend-ready contract",
    description: "The route and result schema are shaped so mock logic can later be replaced by a real lab or HPC execution layer.",
    icon: FlaskConical,
  },
] as const;

export default function HomePage() {
  return (
    <AppFrame>
      <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="max-w-3xl">
          <StatusPill>Conformer input only</StatusPill>
          <h1 className="theme-text-primary mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
            Upload a molecular conformer to preview generated crystal structure candidates.
          </h1>
          <p className="theme-text-secondary mt-6 max-w-2xl text-base leading-8 sm:text-lg">
            MolCrystalFlow Demo is a polished research prototype for a future molecular crystal generation platform. Upload a single `.xyz` file to
            walk through the product flow today and review believable, precomputed candidate outputs in demo mode.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/results/demo-sample"
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              Open sample result
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="/demo/sample_input.xyz"
              download
              className="theme-button-accent inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              Download sample `.xyz`
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
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
          </div>
        </div>

        <UploadForm />
      </section>

      <LandingInfoSections />
    </AppFrame>
  );
}
