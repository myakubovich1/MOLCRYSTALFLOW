"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, LoaderCircle, RotateCcw } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { buildViewerSourcesFromArtifacts } from "@/lib/structure-viewer";
import type { ResultFile, ViewerSource } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseXyzText, splitMultiXyzText } from "@/lib/xyz";

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
  const [themeToken, setThemeToken] = useState(() => (typeof document === "undefined" ? "light" : document.documentElement.dataset.theme ?? "light"));

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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeToken(document.documentElement.dataset.theme ?? "light");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const selectedSource = selectedArtifactName ? sourcesByArtifact[selectedArtifactName] : undefined;
  const selectedStructure = selectedSource?.structures[selectedCandidateIndex] ?? null;
  const selectedArtifact = selectedArtifactName ? artifactMap.get(selectedArtifactName) : undefined;
  const parsedSelectedStructure = selectedStructure ? parseXyzText(selectedStructure) : null;

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

    if (!selectedStructure) {
      viewerRef.current?.clear();
      viewerRef.current?.render();
      return;
    }

    const resolvedStructure = selectedStructure;
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
      viewer.addModel(resolvedStructure, "xyz");
      viewer.setStyle({}, {
        stick: { radius: 0.17, colorscheme: "Jmol" },
        sphere: { scale: 0.28, colorscheme: "Jmol" },
      });
      viewer.zoomTo();
      viewer.render();
      viewer.resize();
    }

    void renderStructure();
    return () => { isCancelled = true; };
  }, [selectedStructure, themeToken]);

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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative">
          <div
            ref={viewerContainerRef}
            className="min-h-[28rem] rounded-xl border border-[color:var(--surface-border)]"
            style={{ background: "var(--molecule-surface)" }}
          />
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

        <div className="space-y-3">
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
