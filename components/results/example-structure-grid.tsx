"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, Atom, LoaderCircle } from "lucide-react";

import { StructureViewerModal } from "@/components/results/structure-viewer-modal";
import { useTheme } from "@/components/theme/theme-provider";
import { loadExampleStructures, getExampleMoleculeInfo } from "@/lib/example-structures";
import type { ExampleStructure, LatticeParameters } from "@/lib/types";

type ThreeDMolViewer = {
  clear: () => void;
  addModel: (data?: string, format?: string, options?: unknown) => unknown;
  setStyle: (sel: Record<string, unknown>, style?: Record<string, unknown>) => unknown;
  setBackgroundColor: (color: number | string, alpha?: number) => unknown;
  zoomTo: () => unknown;
  render: () => unknown;
  resize: () => unknown;
};

type ThreeDMolModule = {
  createViewer: (element: HTMLElement, config?: Record<string, unknown>) => ThreeDMolViewer;
};

function downloadXyz(structure: ExampleStructure) {
  const blob = new Blob([structure.xyzText], { type: "chemical/x-xyz" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `z${structure.zValue}_candidate_${structure.index + 1}.xyz`;
  a.click();
  URL.revokeObjectURL(url);
}

function LatticeTable({ lp }: { lp: LatticeParameters }) {
  const rows = [
    { label: "a", value: `${lp.a.toFixed(2)} Å` },
    { label: "\u03b1", value: `${lp.alpha.toFixed(1)}°` },
    { label: "b", value: `${lp.b.toFixed(2)} Å` },
    { label: "\u03b2", value: `${lp.beta.toFixed(1)}°` },
    { label: "c", value: `${lp.c.toFixed(2)} Å` },
    { label: "\u03b3", value: `${lp.gamma.toFixed(1)}°` },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between">
          <span className="theme-text-muted font-medium">{r.label}:</span>
          <span className="theme-text-primary font-[family:var(--font-mono)]">{r.value}</span>
        </div>
      ))}
      <div className="col-span-2 flex justify-between border-t border-[color:var(--surface-border)] pt-1 mt-1">
        <span className="theme-text-muted font-medium">Volume:</span>
        <span className="theme-text-primary font-[family:var(--font-mono)]">{lp.volume.toFixed(1)} Å³</span>
      </div>
    </div>
  );
}

function StructureCard({
  structure,
  displayIndex,
  thumbnailUrl,
  onView,
}: {
  structure: ExampleStructure;
  displayIndex: number;
  thumbnailUrl: string | null;
  onView: () => void;
}) {
  return (
    <div className="surface-panel overflow-hidden">
      <button
        type="button"
        onClick={onView}
        className="group relative block w-full cursor-pointer"
      >
        <div className="aspect-square w-full overflow-hidden" style={{ background: "var(--molecule-surface)" }}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Z=${structure.zValue} #${displayIndex}`}
              className="h-full w-full object-contain transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-full w-full animate-pulse rounded bg-[color:var(--surface-soft)]" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow">
            View 3D
          </span>
        </div>
      </button>

      <div className="p-3 space-y-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="theme-chip rounded-full px-2 py-0.5 text-[10px] font-medium">
            Z={structure.zValue} #{displayIndex}
          </span>
          <span className="theme-text-muted text-xs">{structure.atomCount} atoms</span>
        </div>

        <LatticeTable lp={structure.lattice} />

        <div className="flex items-center justify-end text-xs">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onView}
              className="theme-button-outline inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
            >
              <Eye className="h-3 w-3" />
              3D
            </button>
            <button
              type="button"
              onClick={() => downloadXyz(structure)}
              className="theme-button-accent inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
            >
              <Download className="h-3 w-3" />
              XYZ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getViewerBg(resolvedTheme: string) {
  return resolvedTheme === "dark" ? "#07111b" : "#f7fbfd";
}

function useSnapshotRenderer(structures: ExampleStructure[], resolvedTheme: string) {
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const offscreenRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (structures.length === 0) return;

    let cancelled = false;
    const bg = getViewerBg(resolvedTheme);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:300px;height:300px;";
    document.body.appendChild(container);
    offscreenRef.current = container;

    async function renderAll() {
      const mod = (await import("3dmol")) as unknown as ThreeDMolModule & { default?: ThreeDMolModule };
      const $3Dmol = mod.default ?? mod;

      if (cancelled) return;

      const viewer = $3Dmol.createViewer(container, {
        antialias: true,
        backgroundColor: bg,
      });

      for (const structure of structures) {
        if (cancelled) break;

        viewer.clear();
        viewer.setBackgroundColor(bg, 1);
        viewer.addModel(structure.xyzText, "xyz");
        viewer.setStyle({}, {
          stick: { radius: 0.15, colorscheme: "Jmol" },
          sphere: { scale: 0.25, colorscheme: "Jmol" },
        });
        viewer.zoomTo();
        viewer.render();

        // Wait for render to complete before capturing
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => requestAnimationFrame(resolve));

        if (cancelled) break;

        const canvas = container.querySelector("canvas");
        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          setThumbnails((prev) => ({ ...prev, [structure.index]: dataUrl }));
        }
      }
    }

    void renderAll();

    return () => {
      cancelled = true;
      if (offscreenRef.current && document.body.contains(offscreenRef.current)) {
        document.body.removeChild(offscreenRef.current);
      }
    };
  }, [structures, resolvedTheme]);

  return thumbnails;
}

type ZFilter = "all" | 2 | 4;

export function ExampleStructureGrid() {
  const { resolvedTheme } = useTheme();
  const [structures, setStructures] = useState<ExampleStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [zFilter, setZFilter] = useState<ZFilter>("all");
  const [viewerStructure, setViewerStructure] = useState<ExampleStructure | null>(null);

  useEffect(() => {
    loadExampleStructures().then((data) => {
      setStructures(data);
      setLoading(false);
    });
  }, []);

  const thumbnails = useSnapshotRenderer(structures, resolvedTheme);

  const filtered = zFilter === "all" ? structures : structures.filter((s) => s.zValue === zFilter);

  const displayIndices = new Map<number, number>();
  const zCounters = new Map<number, number>();
  for (const s of structures) {
    const count = (zCounters.get(s.zValue) ?? 0) + 1;
    zCounters.set(s.zValue, count);
    displayIndices.set(s.index, count);
  }

  const molInfo = getExampleMoleculeInfo();

  const zValues = [...new Set(structures.map((s) => s.zValue))].sort();

  const handleNavigate = useCallback(
    (index: number) => {
      const target = filtered.find((s) => s.index === index);
      if (target) setViewerStructure(target);
    },
    [filtered],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <LoaderCircle className="theme-text-accent h-5 w-5 animate-spin" />
        <p className="theme-text-secondary text-sm">Loading example structures...</p>
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Atom className="theme-text-muted h-5 w-5" />
        <p className="theme-text-secondary text-sm">No example structures available.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h2 className="theme-text-primary text-lg font-semibold">Example Crystal Structures</h2>
            <span className="theme-text-muted text-sm">({structures.length})</span>
          </div>
          <p className="theme-text-secondary mt-1 text-sm">
            {molInfo.name} ({molInfo.formula}) — generate your own to replace these
          </p>
        </div>

        <div className="theme-subpanel-soft rounded-full p-1 flex gap-1">
          {(["all", ...zValues] as const).map((z) => (
            <button
              key={String(z)}
              type="button"
              onClick={() => setZFilter(z as ZFilter)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                zFilter === z
                  ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-sm"
                  : "theme-text-secondary hover:text-[color:var(--text-primary)]"
              }`}
            >
              {z === "all" ? "All" : `Z = ${z}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((structure) => (
          <StructureCard
            key={structure.index}
            structure={structure}
            displayIndex={displayIndices.get(structure.index) ?? structure.index + 1}
            thumbnailUrl={thumbnails[structure.index] ?? null}
            onView={() => setViewerStructure(structure)}
          />
        ))}
      </div>

      {viewerStructure && (
        <StructureViewerModal
          structure={viewerStructure}
          structures={filtered}
          displayIndices={displayIndices}
          onClose={() => setViewerStructure(null)}
          onNavigate={handleNavigate}
        />
      )}
    </div>
  );
}
