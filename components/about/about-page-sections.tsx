"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, ExternalLink } from "lucide-react";

const CITATION = `@article{molcrystalflow2024,
  title={MolCrystalFlow: Molecular Crystal Structure Generation via Flow Matching},
  author={University of Florida},
  year={2024}
}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="theme-button-outline inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy citation"}
    </button>
  );
}

const steps = [
  { label: "Provide a molecular conformer", detail: "Upload a .xyz file, paste XYZ text, or load an example" },
  { label: "Set generation parameters", detail: "Choose Z values (Z=2, Z=4) and structures per Z" },
  { label: "Click Generate Structures", detail: "The system submits to the backend and shows progress" },
  { label: "View results", detail: "Inspect candidates in the interactive 3D viewer, browse by Z value" },
  { label: "Download", detail: "Individual structure files or bulk XYZ downloads" },
];

export function AboutPageSections() {
  return (
    <div className="mx-auto max-w-7xl space-y-16">
      {/* Hero header — full width */}
      <header className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="theme-text-primary text-4xl font-semibold tracking-tight sm:text-5xl">
            About MolCrystalFlow
          </h1>
          <p className="theme-text-secondary mt-5 text-base leading-8 max-w-prose">
            MolCrystalFlow is a web interface for molecular crystal candidate generation.
            Given a molecular conformer as input, the system generates candidate crystal
            packings using the MolCrystalFlow model, returning downloadable structure files
            and interactive 3D previews.
          </p>
          <p className="theme-text-muted mt-3 text-sm">
            Developed at the University of Florida.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="theme-button-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium">
              Go to Generate
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Liu-Group-UF/MolCrystalFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="theme-button-outline inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        </div>

        {/* Input / Output cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="theme-subpanel rounded-2xl p-6">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Input</p>
            <p className="theme-text-primary mt-3 text-lg font-medium">Molecular conformer</p>
            <p className="theme-text-secondary mt-1 text-sm">Standard XYZ format with atomic coordinates</p>
          </div>
          <div className="theme-subpanel rounded-2xl p-6">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Output</p>
            <p className="theme-text-primary mt-3 text-lg font-medium">Crystal structures</p>
            <p className="theme-text-secondary mt-1 text-sm">Candidate packings at Z = 2 and Z = 4</p>
          </div>
        </div>
      </header>

      {/* Method + Model — two-column grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Method</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 theme-text-secondary">
            <p>
              MolCrystalFlow targets the crystal packing generation stage of crystal structure
              prediction (CSP). Unlike composition-first approaches, MolCrystalFlow is
              conformer-first: the user provides a molecular conformer in XYZ format, and the
              model generates candidate crystal packings at specified Z values (molecules per unit cell).
            </p>
            <p>
              Generated structures are candidates for further ranking and optimization using
              downstream methods such as ML interatomic potentials and DFT.
            </p>
          </div>
        </section>

        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Model</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Checkpoint</p>
              <p className="theme-text-primary mt-2 text-base font-medium font-[family:var(--font-mono)]">omc25-mcf</p>
            </div>
            <div className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Architecture</p>
              <p className="theme-text-primary mt-2 text-base font-medium">Flow matching</p>
              <p className="theme-text-secondary mt-0.5 text-xs">Generative model</p>
            </div>
          </div>
        </section>
      </div>

      {/* How to Use — full-width horizontal steps */}
      <section>
        <h2 className="theme-text-primary text-2xl font-semibold">How to Use</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <div key={i} className="theme-subpanel rounded-2xl p-5">
              <span className="theme-chip-accent inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <p className="theme-text-primary mt-3 text-sm font-semibold">{step.label}</p>
              <p className="theme-text-secondary mt-1 text-xs leading-5">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technical Details — full-width 4-column */}
      <section>
        <h2 className="theme-text-primary text-2xl font-semibold">Technical Details</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Frontend", value: "Next.js", detail: "TypeScript, Tailwind CSS" },
            { label: "Backend", value: "MolCrystalFlow", detail: "GPU inference (Ubuntu)" },
            { label: "Visualization", value: "3Dmol.js", detail: "Interactive 3D viewer" },
            { label: "Data Format", value: "Extended XYZ", detail: "With lattice parameters" },
          ].map((item) => (
            <div key={item.label} className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">{item.label}</p>
              <p className="theme-text-primary mt-2 text-base font-medium">{item.value}</p>
              <p className="theme-text-secondary mt-0.5 text-xs">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Citation + Links — two-column footer */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] border-t border-[color:var(--surface-border)] pt-12">
        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Citation</h2>
          <div className="theme-subpanel mt-4 rounded-2xl p-5">
            <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap font-[family:var(--font-mono)] text-xs leading-6">
              {CITATION}
            </pre>
            <div className="mt-4">
              <CopyButton text={CITATION} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Links</h2>
          <div className="mt-4 space-y-3">
            <a
              href="https://github.com/Liu-Group-UF/MolCrystalFlow"
              target="_blank"
              rel="noopener noreferrer"
              className="theme-subpanel flex items-center gap-4 rounded-2xl p-5 transition hover:bg-[color:var(--surface-muted)]"
            >
              <ExternalLink className="theme-text-accent h-5 w-5 shrink-0" />
              <div>
                <p className="theme-text-primary text-sm font-medium">GitHub Repository</p>
                <p className="theme-text-muted text-xs">Liu-Group-UF/MolCrystalFlow</p>
              </div>
            </a>
            <Link
              href="/"
              className="theme-subpanel flex items-center gap-4 rounded-2xl p-5 transition hover:bg-[color:var(--surface-muted)]"
            >
              <ArrowRight className="theme-text-accent h-5 w-5 shrink-0" />
              <div>
                <p className="theme-text-primary text-sm font-medium">Generate Structures</p>
                <p className="theme-text-muted text-xs">Start generating crystal candidates</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
