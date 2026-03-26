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
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Upload a molecular conformer to preview generated crystal structure candidates.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            MolCrystalFlow Demo is a polished research prototype for a future molecular crystal generation platform. Upload a single `.xyz` file to
            walk through the product flow today and review believable, precomputed candidate outputs in demo mode.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/results/demo-sample"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/[0.07]"
            >
              Open sample result
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="/demo/sample_input.xyz"
              download
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-300/35 hover:bg-cyan-300/15"
            >
              Download sample `.xyz`
            </a>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {architectureCards.map((card) => {
              const Icon = card.icon;

              return (
                <Panel key={card.title} className="p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-100">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-lg font-semibold text-white">{card.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{card.description}</p>
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
