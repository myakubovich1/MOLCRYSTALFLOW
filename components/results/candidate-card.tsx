"use client";

import { useId, useRef, useState } from "react";
import { ArrowDownToLine, Eye, Layers3 } from "lucide-react";

import { CrystalStructureVisual, type CrystalStructureView } from "@/components/results/crystal-structure-visual";
import { Panel } from "@/components/ui/panel";
import type { CandidatePreview } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CandidateCardProps {
  candidate: CandidatePreview;
  formula: string;
  atomCount: number;
}

interface MetricTileProps {
  label: string;
  value: string;
  wide?: boolean;
}

function MetricTile({ label, value, wide = false }: MetricTileProps) {
  return (
    <div
      className={cn(
        "theme-subpanel-soft flex items-center justify-between rounded-[22px] px-4 py-4",
        wide && "sm:col-span-2",
      )}
    >
      <span className="theme-text-secondary text-sm font-semibold tracking-[0.01em] sm:text-base">{label}</span>
      <span className="theme-text-primary font-[family:var(--font-mono)] text-base sm:text-[1.15rem]">{value}</span>
    </div>
  );
}

function formatDistance(value: number) {
  return `${value.toFixed(2)} Å`;
}

function formatAngle(value: number) {
  return `${value.toFixed(1)}°`;
}

function formatVolume(value: number) {
  return `${value.toFixed(1)} Å³`;
}

export function CandidateCard({ candidate, formula, atomCount }: CandidateCardProps) {
  const [view, setView] = useState<CrystalStructureView>("ortho");
  const [isExporting, setIsExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gradientKey = useId().replace(/:/g, "");

  const handleExportPng = async () => {
    if (!svgRef.current || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(svgRef.current);
      const markup = serialized.includes("xmlns=")
        ? serialized
        : serialized.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

      const svgBlob = new Blob([markup], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const width = 360;
        const height = 280;
        const scale = Math.max(2, Math.min(window.devicePixelRatio || 2, 3));
        canvas.width = width * scale;
        canvas.height = height * scale;

        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(svgUrl);
          setIsExporting(false);
          return;
        }

        const styles = getComputedStyle(document.documentElement);
        const panelFill = styles.getPropertyValue("--panel-fill").trim() || "#ffffff";
        context.scale(scale, scale);
        context.fillStyle = panelFill;
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = pngUrl;
            link.download = `${candidate.id}-${view}-preview.png`;
            link.click();
            URL.revokeObjectURL(pngUrl);
          }

          URL.revokeObjectURL(svgUrl);
          setIsExporting(false);
        }, "image/png");
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        setIsExporting(false);
      };

      image.src = svgUrl;
    } catch {
      setIsExporting(false);
    }
  };

  return (
    <Panel className="overflow-hidden p-3 sm:p-4">
      <div className="theme-subpanel-soft grid grid-cols-2 rounded-[24px] p-1.5">
        {(["ortho", "3d"] as const).map((option) => {
          const isActive = view === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              onClick={() => setView(option)}
              className={cn(
                "rounded-[18px] px-4 py-4 text-lg font-semibold transition",
                isActive
                  ? "bg-[color:var(--panel-fill)] theme-text-accent shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                  : "theme-text-secondary hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--text-primary)]",
              )}
            >
              {option === "ortho" ? "Ortho" : "3D"}
            </button>
          );
        })}
      </div>

      <div className="theme-subpanel-soft mt-4 rounded-[28px] p-4 sm:p-5">
        <div className="flex justify-center">
          <CrystalStructureVisual accent={candidate.accent} view={view} gradientKey={gradientKey} svgRef={svgRef} />
        </div>
      </div>

      <div className="px-2 pb-2 pt-5 text-center">
        <div className="theme-text-muted flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em]">
          <Layers3 className="h-3.5 w-3.5" />
          <span>
            {candidate.title} • {candidate.mode} • Z = {candidate.zValue}
          </span>
        </div>
        <h3 className="theme-text-primary mt-4 text-3xl font-semibold tracking-tight sm:text-[2.75rem]">{formula}</h3>
        <p className="theme-text-secondary mt-3 text-sm leading-6">{candidate.summary}</p>
      </div>

      <div className="mt-4 border-t border-[color:var(--surface-border)] pt-5">
        <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.28em]">Lattice parameters</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricTile label="a" value={formatDistance(candidate.latticeParameters.a)} />
          <MetricTile label="α" value={formatAngle(candidate.latticeParameters.alpha)} />
          <MetricTile label="b" value={formatDistance(candidate.latticeParameters.b)} />
          <MetricTile label="β" value={formatAngle(candidate.latticeParameters.beta)} />
          <MetricTile label="c" value={formatDistance(candidate.latticeParameters.c)} />
          <MetricTile label="γ" value={formatAngle(candidate.latticeParameters.gamma)} />
          <MetricTile label="Volume" value={formatVolume(candidate.latticeParameters.volume)} wide />
          <MetricTile label="Atoms" value={String(atomCount)} wide />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a
          href={candidate.artifactHref}
          target="_blank"
          rel="noreferrer"
          className="theme-button-outline inline-flex items-center justify-center gap-2 rounded-[20px] px-4 py-4 text-base font-semibold"
        >
          <Eye className="h-4 w-4" />
          View XYZ
        </a>
        <button
          type="button"
          onClick={handleExportPng}
          disabled={isExporting}
          className="theme-button-accent inline-flex items-center justify-center gap-2 rounded-[20px] px-4 py-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          <ArrowDownToLine className="h-4 w-4" />
          {isExporting ? "Preparing PNG" : "PNG"}
        </button>
      </div>

      <div className="theme-text-muted mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] uppercase tracking-[0.18em]">
        <span>{candidate.confidenceLabel}</span>
        <span>{candidate.lattice}</span>
      </div>
    </Panel>
  );
}
