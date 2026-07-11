"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LoaderCircle, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import {
  crystalPackingRepeats,
  drawCrystalLattice,
  formatLatticeMetric,
  getCrystalStyleSpec,
  type CrystalPackingMode,
  type CrystalProjectionMode,
  type CrystalStyleMode,
} from "@/components/results/crystal-viewer-utils";
import { useTheme } from "@/components/theme/theme-provider";
import { Panel } from "@/components/ui/panel";
import { buildViewerSourcesFromArtifacts } from "@/lib/structure-viewer";
import type { CandidateFilterRecord, ResultFile, ViewerSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildReplicatedXyzText, parseXyzText, splitMultiXyzText } from "@/lib/xyz";

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

interface InteractiveStructureViewerProps {
  jobId: string;
  formula: string;
  atomCount: number;
  resultFiles: ResultFile[];
}

function getViewerBackgroundColor() {
  return document.documentElement.dataset.theme === "dark" ? "#07111b" : "#f7fbfd";
}

export function InteractiveStructureViewer({
  jobId,
  formula,
  atomCount,
  resultFiles,
}: InteractiveStructureViewerProps) {
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ThreeDMolViewer | null>(null);

  const availableSources = useMemo(() => buildViewerSourcesFromArtifacts(resultFiles), [resultFiles]);
  const artifactMap = useMemo(() => new Map(resultFiles.map((file) => [file.name, file])), [resultFiles]);

  const [sourcesByArtifact, setSourcesByArtifact] = useState<Record<string, ViewerSource>>({});
  const [selectedArtifactName, setSelectedArtifactName] = useState<string | null>(availableSources[0]?.artifactName ?? null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [loadingArtifactName, setLoadingArtifactName] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<CrystalStyleMode>("ball-stick");
  const [packingMode, setPackingMode] = useState<CrystalPackingMode>("cell");
  const [projectionMode, setProjectionMode] = useState<CrystalProjectionMode>("orthographic");
  const [candidateRecords, setCandidateRecords] = useState<CandidateFilterRecord[]>([]);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const nextSelectedArtifact =
      selectedArtifactName && availableSources.some((source) => source.artifactName === selectedArtifactName)
        ? selectedArtifactName
        : availableSources[0]?.artifactName ?? null;

    setSelectedArtifactName(nextSelectedArtifact);
    setSelectedCandidateIndex(0);
    setViewerError(null);
  }, [availableSources, selectedArtifactName]);

  useEffect(() => {
    setSelectedCandidateIndex(0);
    setViewerError(null);
  }, [selectedArtifactName]);

  const selectedSource = selectedArtifactName ? sourcesByArtifact[selectedArtifactName] : undefined;
  const selectedStructure = selectedSource?.structures[selectedCandidateIndex] ?? null;
  const selectedArtifact = selectedArtifactName ? artifactMap.get(selectedArtifactName) : undefined;
  const parsedSelectedStructure = selectedStructure ? parseXyzText(selectedStructure) : null;
  const latticeParameters = parsedSelectedStructure?.latticeParameters;
  const latticeVectors = parsedSelectedStructure?.latticeVectors;
  const selectedCandidateRecord = useMemo(() => {
    if (!selectedSource) return undefined;
    return candidateRecords.find(
      (record) =>
        record.zValue === selectedSource.zValue &&
        record.acceptedIndex === selectedCandidateIndex,
    );
  }, [candidateRecords, selectedCandidateIndex, selectedSource]);
  const displayStructure = useMemo(() => {
    if (!selectedStructure) return null;
    return buildReplicatedXyzText(selectedStructure, crystalPackingRepeats[packingMode]);
  }, [packingMode, selectedStructure]);

  useEffect(() => {
    const manifest = resultFiles.find((file) => file.kind === "manifest");
    if (!manifest) {
      setCandidateRecords([]);
      return;
    }

    const resolvedManifest = manifest;
    const abortController = new AbortController();

    async function loadManifest() {
      try {
        const response = await fetch(resolvedManifest.href, {
          cache: "no-store",
          signal: abortController.signal,
        });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload?.candidates)) return;
        setCandidateRecords(
          payload.candidates.filter(
            (candidate: unknown): candidate is CandidateFilterRecord =>
              typeof candidate === "object" &&
              candidate !== null &&
              typeof (candidate as CandidateFilterRecord).id === "string",
          ),
        );
      } catch {
        if (!abortController.signal.aborted) setCandidateRecords([]);
      }
    }

    void loadManifest();
    return () => abortController.abort();
  }, [resultFiles]);

  useEffect(() => {
    if (!selectedArtifactName) return;

    const baseSource = availableSources.find((source) => source.artifactName === selectedArtifactName);
    const artifact = artifactMap.get(selectedArtifactName);

    if (!baseSource || !artifact) return;

    const resolvedArtifactName = selectedArtifactName;
    const resolvedArtifact = artifact;
    const resolvedBaseSource = baseSource;

    if (sourcesByArtifact[resolvedArtifactName]?.structures.length) return;

    const abortController = new AbortController();

    async function loadArtifact() {
      setLoadingArtifactName(resolvedArtifactName);
      setViewerError(null);

      try {
        const response = await fetch(resolvedArtifact.href, { cache: "no-store", signal: abortController.signal });
        const rawText = await response.text();

        if (!response.ok) throw new Error(rawText || `Unable to load ${resolvedArtifact.name}.`);

        const structures = splitMultiXyzText(rawText);
        if (structures.length === 0) throw new Error(`${resolvedArtifact.name} did not contain readable XYZ structures.`);

        setSourcesByArtifact((current) => ({
          ...current,
          [resolvedArtifactName]: { ...resolvedBaseSource, rawText, structures },
        }));
      } catch (error) {
        if (abortController.signal.aborted) return;
        setViewerError(error instanceof Error ? error.message : `Unable to load ${resolvedArtifact.name}.`);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingArtifactName((current) => (current === resolvedArtifactName ? null : current));
        }
      }
    }

    void loadArtifact();
    return () => { abortController.abort(); };
  }, [availableSources, artifactMap, selectedArtifactName, sourcesByArtifact]);

  useEffect(() => {
    if (!selectedSource || selectedSource.structures.length === 0) return;
    if (selectedCandidateIndex >= selectedSource.structures.length) {
      setSelectedCandidateIndex(Math.max(0, selectedSource.structures.length - 1));
    }
  }, [selectedCandidateIndex, selectedSource]);

  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container) return;

    if (!displayStructure) {
      viewerRef.current?.clear();
      viewerRef.current?.render();
      return;
    }

    const resolvedStructure = displayStructure;
    const resolvedLatticeVectors = latticeVectors;
    const resolvedRepeats = crystalPackingRepeats[packingMode];
    const resolvedStyleMode = styleMode;
    const resolvedProjectionMode = projectionMode;
    let isCancelled = false;

    async function renderStructure() {
      const importedModule = (await import("3dmol")) as unknown as ThreeDMolModule & { default?: ThreeDMolModule };
      const threeDMol = importedModule.default ?? importedModule;

      if (isCancelled || !viewerContainerRef.current) return;

      if (!viewerRef.current) {
        viewerRef.current = threeDMol.createViewer(viewerContainerRef.current, {
          antialias: true,
          backgroundColor: getViewerBackgroundColor(),
        });
      }

      const viewer = viewerRef.current;
      viewer.clear();
      viewer.setBackgroundColor(getViewerBackgroundColor(), 1);
      viewer.setProjection(resolvedProjectionMode);
      viewer.addModel(resolvedStructure, "xyz");
      viewer.setStyle({}, getCrystalStyleSpec(resolvedStyleMode));
      if (resolvedLatticeVectors) {
        drawCrystalLattice(viewer, resolvedLatticeVectors, resolvedRepeats);
      }
      viewer.zoomTo();
      viewer.render();
      viewer.resize();
    }

    void renderStructure();
    return () => { isCancelled = true; };
  }, [displayStructure, latticeVectors, packingMode, projectionMode, resolvedTheme, styleMode]);

  useEffect(() => {
    const container = viewerContainerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      viewerRef.current?.resize();
      viewerRef.current?.render();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  if (availableSources.length === 0) {
    return (
      <Panel className="p-6">
        <p className="theme-text-secondary text-sm">
          No Z-specific structure files available for 3D preview. Download the artifacts above to inspect structures locally.
        </p>
      </Panel>
    );
  }

  const totalStructures = selectedSource?.structures.length ?? 0;
  const isLoadingSelectedArtifact = loadingArtifactName === selectedArtifactName;
  const handleZoom = (factor: number) => {
    viewerRef.current?.zoom(factor, 180, true);
    viewerRef.current?.render();
  };

  return (
    <Panel className="p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="theme-text-primary text-lg font-semibold">3D Structure Viewer</h2>
          <span className="theme-chip-accent rounded-full px-2.5 py-0.5 text-xs">{formula}</span>
        </div>

        <div className="theme-subpanel-soft rounded-full p-1">
          <div className="flex gap-1">
            {availableSources.map((source) => (
              <button
                key={source.artifactName}
                type="button"
                onClick={() => setSelectedArtifactName(source.artifactName)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  selectedArtifactName === source.artifactName
                    ? "bg-[color:var(--panel-fill)] theme-text-primary shadow-sm"
                    : "theme-text-secondary hover:text-[color:var(--text-primary)]",
                )}
              >
                {source.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="theme-subpanel-soft rounded-full p-1">
          <div className="flex gap-1">
            {[
              ["ball-stick", "Ball + stick"],
              ["spacefill", "Spacefill"],
              ["sticks", "Sticks"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStyleMode(value as CrystalStyleMode)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
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

        <div className="theme-subpanel-soft rounded-full p-1">
          <div className="flex gap-1">
            {[
              ["cell", "Unit cell"],
              ["packing", "2x2 packing"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPackingMode(value as CrystalPackingMode)}
                disabled={value === "packing" && !latticeVectors}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
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

        <div className="theme-subpanel-soft rounded-full p-1">
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
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <div
            ref={viewerContainerRef}
            className="min-h-[34rem] rounded-xl border border-[color:var(--surface-border)] lg:min-h-[42rem] xl:min-h-[50rem]"
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
          {(!selectedStructure || isLoadingSelectedArtifact || viewerError) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[color:var(--surface-soft)]/80 backdrop-blur-sm">
              <div className="text-center">
                {isLoadingSelectedArtifact && <LoaderCircle className="theme-text-accent mx-auto h-5 w-5 animate-spin" />}
                <p className="theme-text-secondary mt-2 text-sm">
                  {viewerError ?? (isLoadingSelectedArtifact ? "Loading structures..." : "Select a Z bucket")}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 xl:max-h-[50rem] xl:overflow-y-auto xl:pr-1">
          <div className="theme-subpanel rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="theme-text-muted text-xs">Candidate</span>
              {isLoadingSelectedArtifact && <LoaderCircle className="theme-text-accent h-3 w-3 animate-spin" />}
            </div>
            <p className="theme-text-primary mt-1 text-sm font-medium">
              {totalStructures > 0 ? `${selectedCandidateIndex + 1} of ${totalStructures}` : "Loading..."}
            </p>

            <div className="mt-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCandidateIndex((c) => Math.max(0, c - 1))}
                disabled={isLoadingSelectedArtifact || selectedCandidateIndex === 0 || totalStructures === 0}
                className="theme-button-outline inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous candidate"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={totalStructures > 0 ? String(selectedCandidateIndex) : ""}
                onChange={(e) => setSelectedCandidateIndex(Number(e.target.value))}
                disabled={isLoadingSelectedArtifact || totalStructures === 0}
                className="theme-input h-8 flex-1 rounded-lg px-2 text-xs"
              >
                {totalStructures > 0 ? (
                  Array.from({ length: totalStructures }, (_, i) => (
                    <option key={i} value={String(i)}>#{i + 1}</option>
                  ))
                ) : (
                  <option value="">...</option>
                )}
              </select>

              <button
                type="button"
                onClick={() => setSelectedCandidateIndex((c) => Math.min(totalStructures - 1, c + 1))}
                disabled={isLoadingSelectedArtifact || totalStructures === 0 || selectedCandidateIndex >= totalStructures - 1}
                className="theme-button-outline inline-flex h-8 w-8 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next candidate"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {parsedSelectedStructure && (
            <div className="theme-subpanel rounded-xl p-3">
              <span className="theme-text-muted text-xs">Atoms</span>
              <p className="theme-text-primary mt-1 text-sm font-medium">{parsedSelectedStructure.atomCount}</p>
              {parsedSelectedStructure.commentLine?.trim() && (
                <p className="theme-text-secondary mt-1 text-xs truncate">{parsedSelectedStructure.commentLine}</p>
              )}
            </div>
          )}

          {latticeParameters && (
            <div className="theme-subpanel rounded-xl p-3">
              <span className="theme-text-muted text-xs">Lattice</span>
              <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">a</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.a, " A")}</span>
                </div>
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">alpha</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.alpha, " deg")}</span>
                </div>
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">b</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.b, " A")}</span>
                </div>
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">beta</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.beta, " deg")}</span>
                </div>
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">c</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.c, " A")}</span>
                </div>
                <div className="theme-subpanel-soft rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">gamma</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.gamma, " deg")}</span>
                </div>
                <div className="theme-subpanel-soft col-span-2 rounded-lg px-2 py-1.5">
                  <span className="theme-text-muted">Volume</span>
                  <span className="theme-text-primary float-right font-medium">{formatLatticeMetric(latticeParameters.volume, " A3")}</span>
                </div>
              </div>
            </div>
          )}

          {selectedCandidateRecord && (
            <div className="theme-subpanel rounded-xl p-3">
              <span className="theme-text-muted text-xs">Filtering metrics</span>
              <div className="mt-2 space-y-1.5 text-xs">
                {typeof selectedCandidateRecord.rank === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">UMA rank</span>
                    <span className="theme-text-primary font-medium">#{selectedCandidateRecord.rank}</span>
                  </div>
                )}
                {typeof selectedCandidateRecord.energy === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">UMA energy</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.energy.toFixed(4)} {selectedCandidateRecord.energyUnits ?? "eV/molecule"}
                    </span>
                  </div>
                )}
                {typeof selectedCandidateRecord.minimumVdwRatio === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Minimum vdW ratio</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.minimumVdwRatio.toFixed(3)}
                    </span>
                  </div>
                )}
                {typeof selectedCandidateRecord.clashCount === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Clashes</span>
                    <span className="theme-text-primary font-medium">{selectedCandidateRecord.clashCount}</span>
                  </div>
                )}
                {typeof selectedCandidateRecord.densityGcm3 === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Density</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.densityGcm3.toFixed(3)} g/cm3
                    </span>
                  </div>
                )}
                {typeof selectedCandidateRecord.relativeEnergyEvPerMolecule === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Relative energy</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.relativeEnergyEvPerMolecule.toFixed(4)} eV/molecule
                    </span>
                  </div>
                )}
                {typeof selectedCandidateRecord.maxForceEvPerAngstrom === "number" && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Maximum force</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.maxForceEvPerAngstrom.toFixed(3)} eV/A
                    </span>
                  </div>
                )}
                {selectedCandidateRecord.potentialModel && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Potential</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.potentialModel}
                    </span>
                  </div>
                )}
                {selectedCandidateRecord.optimizationType && (
                  <div className="flex justify-between gap-3">
                    <span className="theme-text-muted">Optimization</span>
                    <span className="theme-text-primary font-medium">
                      {selectedCandidateRecord.optimizationType}
                      {typeof selectedCandidateRecord.optimizationSteps === "number"
                        ? ` (${selectedCandidateRecord.optimizationSteps} steps)`
                        : ""}
                    </span>
                  </div>
                )}
                {selectedCandidateRecord.scoringError && (
                  <div className="theme-error-banner rounded-lg px-2 py-1.5 text-[11px]">
                    Ranking unavailable: {selectedCandidateRecord.scoringError}
                  </div>
                )}
              </div>
            </div>
          )}

          {viewerError && (
            <div className="theme-error-banner rounded-xl px-3 py-2 text-xs">{viewerError}</div>
          )}

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
              Reset view
            </button>
            {selectedArtifact && (
              <a
                href={selectedArtifact.href}
                download
                className="theme-button-accent inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium"
              >
                <Download className="h-3.5 w-3.5" />
                {selectedArtifact.name}
              </a>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
