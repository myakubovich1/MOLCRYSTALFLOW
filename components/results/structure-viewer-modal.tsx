"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

import {
  crystalPackingRepeats,
  drawCrystalLattice,
  getCrystalStyleSpec,
  type CrystalPackingMode,
  type CrystalProjectionMode,
  type CrystalStyleMode,
} from "@/components/results/crystal-viewer-utils";
import { useTheme } from "@/components/theme/theme-provider";
import type { ExampleStructure } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildReplicatedXyzText, parseXyzText } from "@/lib/xyz";

type ThreeDMolViewer = {
  clear: () => void;
  addModel: (data?: string, format?: string, options?: unknown) => unknown;
  addLine: (spec?: Record<string, unknown>) => unknown;
  setStyle: (sel: Record<string, unknown>, style?: Record<string, unknown>) => unknown;
  setBackgroundColor: (color: number | string, alpha?: number) => unknown;
  setProjection: (projection: "orthographic" | "perspective") => unknown;
  zoom: (factor?: number, animationDuration?: number, fixedPath?: boolean) => unknown;
  zoomTo: () => unknown;
  render: () => unknown;
  resize: () => unknown;
};

type ThreeDMolModule = {
  createViewer: (element: HTMLElement, config?: Record<string, unknown>) => ThreeDMolViewer;
};

interface StructureViewerModalProps {
  structure: ExampleStructure;
  structures: ExampleStructure[];
  displayIndices: Map<number, number>;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function getViewerBg() {
  return document.documentElement.dataset.theme === "dark" ? "#07111b" : "#f7fbfd";
}

function downloadXyz(structure: ExampleStructure) {
  const blob = new Blob([structure.xyzText], { type: "chemical/x-xyz" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `z${structure.zValue}_candidate_${structure.index + 1}.xyz`;
  a.click();
  URL.revokeObjectURL(url);
}

export function StructureViewerModal({ structure, structures, displayIndices, onClose, onNavigate }: StructureViewerModalProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ThreeDMolViewer | null>(null);
  const [ready, setReady] = useState(false);
  const [styleMode, setStyleMode] = useState<CrystalStyleMode>("ball-stick");
  const [packingMode, setPackingMode] = useState<CrystalPackingMode>("cell");
  const [projectionMode, setProjectionMode] = useState<CrystalProjectionMode>("orthographic");

  const currentIdx = structures.findIndex((s) => s.index === structure.index);
  const parsedStructure = useMemo(() => parseXyzText(structure.xyzText), [structure.xyzText]);
  const displayStructure = useMemo(
    () => buildReplicatedXyzText(structure.xyzText, crystalPackingRepeats[packingMode]),
    [packingMode, structure.xyzText],
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentIdx > 0) onNavigate(structures[currentIdx - 1].index);
      if (e.key === "ArrowRight" && currentIdx < structures.length - 1) onNavigate(structures[currentIdx + 1].index);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIdx, structures, onClose, onNavigate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bg = getViewerBg();
    let cancelled = false;

    async function render() {
      setReady(false);
      const mod = (await import("3dmol")) as unknown as ThreeDMolModule & { default?: ThreeDMolModule };
      const $3Dmol = mod.default ?? mod;

      if (cancelled || !containerRef.current) return;

      if (!viewerRef.current) {
        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          antialias: true,
          backgroundColor: bg,
        });
      }

      const viewer = viewerRef.current;
      viewer.clear();
      viewer.setBackgroundColor(bg, 1);
      viewer.setProjection(projectionMode);
      viewer.addModel(displayStructure, "xyz");
      viewer.setStyle({}, getCrystalStyleSpec(styleMode));
      if (parsedStructure.latticeVectors) {
        drawCrystalLattice(viewer, parsedStructure.latticeVectors, crystalPackingRepeats[packingMode]);
      }
      viewer.zoomTo();
      viewer.render();
      viewer.resize();
      setReady(true);
    }

    void render();
    return () => { cancelled = true; };
  }, [displayStructure, packingMode, parsedStructure.latticeVectors, projectionMode, resolvedTheme, styleMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      viewerRef.current?.resize();
      viewerRef.current?.render();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const lp = structure.lattice;
  const handleZoom = (factor: number) => {
    viewerRef.current?.zoom(factor, 180, true);
    viewerRef.current?.render();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--app-bg)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[color:var(--surface-border)] px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="theme-text-primary text-sm font-semibold">
              Z={structure.zValue} #{displayIndices.get(structure.index) ?? structure.index + 1}
            </span>
            <span className="theme-chip-accent rounded-full px-2.5 py-0.5 text-xs">{structure.formula}</span>
            <span className="theme-text-muted text-xs">{structure.atomCount} atoms</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate(structures[currentIdx - 1]?.index ?? structure.index)}
              disabled={currentIdx <= 0}
              className="theme-button-outline inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="theme-text-muted text-xs">{currentIdx + 1}/{structures.length}</span>
            <button
              type="button"
              onClick={() => onNavigate(structures[currentIdx + 1]?.index ?? structure.index)}
              disabled={currentIdx >= structures.length - 1}
              className="theme-button-outline inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-40"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="theme-button-outline inline-flex h-8 w-8 items-center justify-center rounded-lg"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid flex-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-[400px]">
            <div
              ref={containerRef}
              className="absolute inset-0"
              style={{ background: "var(--molecule-surface)" }}
            />
            <div className="absolute right-3 top-3 z-10 overflow-hidden rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--panel-fill)]/90 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => handleZoom(1.18)}
                className="theme-text-secondary hover:theme-text-primary flex h-9 w-9 items-center justify-center border-b border-[color:var(--surface-border)] transition hover:bg-[color:var(--surface-soft)]"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(0.85)}
                className="theme-text-secondary hover:theme-text-primary flex h-9 w-9 items-center justify-center transition hover:bg-[color:var(--surface-soft)]"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </div>
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="theme-text-muted text-sm">Loading viewer...</p>
              </div>
            )}
          </div>

          <div className="overflow-y-auto border-l border-[color:var(--surface-border)] p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Style</p>
                <div className="theme-subpanel-soft mt-2 rounded-full p-1">
                  <div className="flex gap-1">
                    {[
                      ["ball-stick", "Ball"],
                      ["spacefill", "Space"],
                      ["sticks", "Sticks"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStyleMode(value as CrystalStyleMode)}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition",
                          styleMode === value
                            ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-sm"
                            : "theme-text-secondary hover:text-[color:var(--text-primary)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Cell View</p>
                <div className="theme-subpanel-soft mt-2 rounded-full p-1">
                  <div className="flex gap-1">
                    {[
                      ["cell", "Unit"],
                      ["packing", "2x2"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setPackingMode(value as CrystalPackingMode)}
                        disabled={value === "packing" && !parsedStructure.latticeVectors}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                          packingMode === value
                            ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-sm"
                            : "theme-text-secondary hover:text-[color:var(--text-primary)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Projection</p>
                <div className="theme-subpanel-soft mt-2 rounded-full p-1">
                  <div className="flex gap-1">
                    {[
                      ["orthographic", "Ortho"],
                      ["perspective", "3D"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setProjectionMode(value as CrystalProjectionMode)}
                        className={cn(
                          "flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition",
                          projectionMode === value
                            ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-sm"
                            : "theme-text-secondary hover:text-[color:var(--text-primary)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="theme-text-muted text-xs font-medium uppercase tracking-wider">Lattice Parameters</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  ["a", `${lp.a.toFixed(2)} Å`],
                  ["\u03b1", `${lp.alpha.toFixed(1)}°`],
                  ["b", `${lp.b.toFixed(2)} Å`],
                  ["\u03b2", `${lp.beta.toFixed(1)}°`],
                  ["c", `${lp.c.toFixed(2)} Å`],
                  ["\u03b3", `${lp.gamma.toFixed(1)}°`],
                ].map(([label, value]) => (
                  <div key={label} className="theme-subpanel rounded-lg px-3 py-2">
                    <span className="theme-text-muted text-xs">{label}</span>
                    <p className="theme-text-primary text-sm font-medium font-[family:var(--font-mono)]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="theme-subpanel mt-2 rounded-lg px-3 py-2">
                <span className="theme-text-muted text-xs">Volume</span>
                <p className="theme-text-primary text-sm font-medium font-[family:var(--font-mono)]">{lp.volume.toFixed(1)} Å³</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  viewerRef.current?.zoomTo();
                  viewerRef.current?.render();
                }}
                className="theme-button-outline inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => downloadXyz(structure)}
                className="theme-button-accent inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                XYZ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
