import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

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
            packings, applies automated geometry screening, ranks accepted candidates by
            learned interatomic-potential energy, and returns downloadable structure files
            with interactive 3D previews.
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
            <p className="theme-text-primary mt-3 text-lg font-medium">Ranked crystal candidates</p>
            <p className="theme-text-secondary mt-1 text-sm">Candidate packings for supported Z values</p>
          </div>
        </div>
      </header>

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
              The current workflow applies geometry validation and periodic molecular clash
              screening before and after 10 rigid-body optimization steps. Candidates that
              pass the final screen are ranked with UMA-s-1p2 using its molecular-crystal
              OMC task. Energy is used for ranking, not as an automatic cutoff.
            </p>
            <p>
              Outputs are computational candidates intended for inspection and downstream
              scientific validation, not experimentally confirmed crystal structures.
            </p>
          </div>
        </section>

        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Model</h2>
          <div className="mt-4 grid gap-4">
            <div className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Generator</p>
              <p className="theme-text-primary mt-2 text-base font-medium">MolCrystalFlow CCDC v2</p>
              <p className="theme-text-secondary mt-0.5 text-xs font-[family:var(--font-mono)]">ccdc-v2-epoch436</p>
            </div>
            <div className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Ranking</p>
              <p className="theme-text-primary mt-2 text-base font-medium">UMA-s-1p2</p>
              <p className="theme-text-secondary mt-0.5 text-xs">OMC task, 10-step rigid-body optimization, and relative potential-energy ranking</p>
            </div>
            <div className="theme-subpanel rounded-2xl p-5">
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Supported outputs</p>
              <p className="theme-text-primary mt-2 text-base font-medium">Z = 2 and Z = 4 candidate packings</p>
              <p className="theme-text-secondary mt-0.5 text-xs">Downloadable XYZ files with lattice metadata and interactive previews</p>
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-[color:var(--surface-border)] pt-12">
        <section>
          <h2 className="theme-text-primary text-2xl font-semibold">Links</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
