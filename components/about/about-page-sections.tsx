"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";

const CITATION = `@article{molcrystalflow2024,
  title={MolCrystalFlow: Molecular Crystal Structure Generation via Flow Matching},
  author={University of Florida},
  year={2024}
}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="theme-text-primary text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

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

export function AboutPageSections() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="theme-text-primary text-3xl font-semibold tracking-tight">About MolCrystalFlow</h1>
        <p className="theme-text-secondary mt-4 text-sm leading-7">
          MolCrystalFlow Demo is a web interface for molecular crystal candidate generation. Given a molecular
          conformer as input, the system generates candidate crystal packings using the MolCrystalFlow model,
          returning downloadable structure files and interactive 3D previews.
        </p>
        <p className="theme-text-secondary mt-3 text-sm leading-7">
          Developed at the University of Florida.
        </p>
      </header>

      <Section title="Method">
        <div className="space-y-3 text-sm leading-7 theme-text-secondary">
          <p>
            MolCrystalFlow targets the crystal packing generation stage of crystal structure prediction (CSP).
            Unlike composition-first approaches, MolCrystalFlow is conformer-first: the user provides a molecular
            conformer in XYZ format, and the model generates candidate crystal packings at specified Z values
            (molecules per unit cell).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="theme-subpanel rounded-xl p-4">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Input</p>
              <p className="theme-text-primary mt-2 text-sm">Molecular conformer in XYZ format</p>
            </div>
            <div className="theme-subpanel rounded-xl p-4">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Output</p>
              <p className="theme-text-primary mt-2 text-sm">Candidate crystal structures at Z = 2 and Z = 4</p>
            </div>
          </div>
          <p>
            Generated structures are candidates for further ranking and optimization using downstream methods
            such as ML interatomic potentials and DFT.
          </p>
        </div>
      </Section>

      <Section title="Model">
        <div className="space-y-3 text-sm leading-7 theme-text-secondary">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="theme-subpanel rounded-xl p-4">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Checkpoint</p>
              <p className="theme-text-primary mt-2 text-sm font-medium">omc25-mcf</p>
            </div>
            <div className="theme-subpanel rounded-xl p-4">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Architecture</p>
              <p className="theme-text-primary mt-2 text-sm">Flow matching generative model</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="How to Use">
        <ol className="space-y-3 text-sm leading-7 theme-text-secondary">
          <li className="flex gap-3">
            <span className="theme-chip-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">1</span>
            <span><strong className="theme-text-primary">Provide a molecular conformer</strong> — upload a .xyz file, paste XYZ text, or load an example</span>
          </li>
          <li className="flex gap-3">
            <span className="theme-chip-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">2</span>
            <span><strong className="theme-text-primary">Set generation parameters</strong> — choose Z values (Z=2, Z=4) and structures per Z</span>
          </li>
          <li className="flex gap-3">
            <span className="theme-chip-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">3</span>
            <span><strong className="theme-text-primary">Click Generate Structures</strong> — the system submits to the backend and shows progress</span>
          </li>
          <li className="flex gap-3">
            <span className="theme-chip-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">4</span>
            <span><strong className="theme-text-primary">View results</strong> — inspect candidates in the interactive 3D viewer, browse by Z value</span>
          </li>
          <li className="flex gap-3">
            <span className="theme-chip-accent flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">5</span>
            <span><strong className="theme-text-primary">Download</strong> — individual structure files or bulk XYZ downloads</span>
          </li>
        </ol>
      </Section>

      <Section title="Technical Details">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="theme-subpanel rounded-xl p-4">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Frontend</p>
            <p className="theme-text-primary mt-2 text-sm">Next.js, TypeScript, Tailwind CSS</p>
          </div>
          <div className="theme-subpanel rounded-xl p-4">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Backend</p>
            <p className="theme-text-primary mt-2 text-sm">MolCrystalFlow on GPU (Ubuntu)</p>
          </div>
          <div className="theme-subpanel rounded-xl p-4">
            <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Visualization</p>
            <p className="theme-text-primary mt-2 text-sm">3Dmol.js (interactive 3D)</p>
          </div>
        </div>
      </Section>

      <Section title="Citation">
        <div className="theme-subpanel rounded-xl p-4">
          <pre className="theme-text-secondary overflow-x-auto whitespace-pre-wrap font-[family:var(--font-mono)] text-xs leading-6">
            {CITATION}
          </pre>
          <div className="mt-3">
            <CopyButton text={CITATION} />
          </div>
        </div>
      </Section>

      <Section title="Links">
        <div className="flex flex-wrap gap-3">
          <span className="theme-chip rounded-lg px-3 py-2 text-sm">Paper (coming soon)</span>
          <span className="theme-chip rounded-lg px-3 py-2 text-sm">GitHub (coming soon)</span>
        </div>
      </Section>

      <div className="border-t border-[color:var(--surface-border)] pt-8">
        <Link href="/" className="theme-button-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium">
          Go to Generate
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
