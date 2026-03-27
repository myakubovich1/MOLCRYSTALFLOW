import type { RefObject } from "react";

import type { CandidatePreview } from "@/lib/types";

export type CrystalStructureView = "ortho" | "3d";

interface CrystalStructureVisualProps {
  accent: CandidatePreview["accent"];
  view: CrystalStructureView;
  gradientKey: string;
  svgRef: RefObject<SVGSVGElement | null>;
}

interface StructureNode {
  x: number;
  y: number;
  radius: number;
  fill: string;
  opacity: number;
}

type Point = [number, number];

const accentPalettes: Record<
  CandidatePreview["accent"],
  {
    glow: string;
    shellCool: string;
    shellWarm: string;
    core: string;
    accent: string;
    shadow: string;
  }
> = {
  cyan: {
    glow: "rgba(125, 211, 252, 0.24)",
    shellCool: "rgba(153, 202, 255, 0.26)",
    shellWarm: "rgba(246, 205, 206, 0.22)",
    core: "rgba(173, 119, 134, 0.58)",
    accent: "rgba(70, 84, 214, 0.72)",
    shadow: "rgba(15, 23, 42, 0.12)",
  },
  violet: {
    glow: "rgba(196, 181, 253, 0.24)",
    shellCool: "rgba(178, 170, 255, 0.24)",
    shellWarm: "rgba(247, 206, 225, 0.2)",
    core: "rgba(147, 117, 180, 0.58)",
    accent: "rgba(79, 70, 229, 0.74)",
    shadow: "rgba(30, 27, 75, 0.14)",
  },
  emerald: {
    glow: "rgba(110, 231, 183, 0.22)",
    shellCool: "rgba(147, 197, 253, 0.22)",
    shellWarm: "rgba(230, 244, 215, 0.2)",
    core: "rgba(99, 146, 120, 0.56)",
    accent: "rgba(5, 150, 105, 0.74)",
    shadow: "rgba(6, 78, 59, 0.12)",
  },
  amber: {
    glow: "rgba(253, 224, 71, 0.22)",
    shellCool: "rgba(196, 181, 253, 0.22)",
    shellWarm: "rgba(253, 230, 138, 0.24)",
    core: "rgba(180, 132, 102, 0.56)",
    accent: "rgba(217, 119, 6, 0.72)",
    shadow: "rgba(120, 53, 15, 0.12)",
  },
};

const solidFrameStroke = "rgba(100, 116, 139, 0.68)";
const hiddenFrameStroke = "rgba(148, 163, 184, 0.4)";

function toPointsString(points: Point[]) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function createFrame(view: CrystalStructureView) {
  if (view === "3d") {
    return {
      front: [
        [122, 60],
        [262, 78],
        [262, 212],
        [122, 194],
      ] as Point[],
      back: [
        [82, 34],
        [222, 52],
        [222, 186],
        [82, 168],
      ] as Point[],
    };
  }

  return {
    front: [
      [116, 58],
      [256, 68],
      [256, 208],
      [116, 198],
    ] as Point[],
    back: [
      [94, 36],
      [234, 46],
      [234, 186],
      [94, 176],
    ] as Point[],
  };
}

function createStructureNodes(view: CrystalStructureView, accent: CandidatePreview["accent"]) {
  const palette = accentPalettes[accent];
  const nodes: Array<StructureNode & { depth: number }> = [];
  const layers = view === "3d" ? 4 : 3;
  const rows = 4;
  const columns = 4;

  for (let layer = 0; layer < layers; layer += 1) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const xBase = view === "3d" ? 106 : 110;
        const yBase = view === "3d" ? 184 : 188;
        const xStep = view === "3d" ? 35 : 34;
        const yStep = view === "3d" ? 28 : 29;
        const layerOffsetX = view === "3d" ? 16 : 10;
        const layerOffsetY = view === "3d" ? 12 : 9;
        const x = xBase + column * xStep + layer * layerOffsetX + (row % 2) * 2;
        const y = yBase - row * yStep - layer * layerOffsetY + (column % 2) * 2;
        const color = (row + column + layer) % 2 === 0 ? palette.shellWarm : palette.shellCool;

        nodes.push({
          x,
          y,
          radius: layer === layers - 1 ? 24 : 18 + layer * 2,
          fill: color,
          opacity: 0.9 - layer * 0.1,
          depth: layer,
        });
      }
    }
  }

  nodes.push(
    {
      x: view === "3d" ? 178 : 184,
      y: view === "3d" ? 132 : 136,
      radius: 38,
      fill: palette.core,
      opacity: 1,
      depth: layers + 1,
    },
    {
      x: view === "3d" ? 176 : 182,
      y: view === "3d" ? 174 : 176,
      radius: 18,
      fill: palette.accent,
      opacity: 1,
      depth: layers + 2,
    },
  );

  return nodes.sort((left, right) => left.depth - right.depth);
}

function createConnectorLines(view: CrystalStructureView) {
  if (view === "3d") {
    return [
      [150, 70, 150, 196],
      [194, 76, 194, 202],
      [238, 84, 238, 210],
      [96, 152, 234, 170],
      [106, 118, 244, 136],
    ];
  }

  return [
    [136, 68, 136, 198],
    [178, 72, 178, 202],
    [220, 76, 220, 206],
    [98, 148, 238, 158],
    [104, 112, 244, 122],
  ];
}

export function CrystalStructureVisual({
  accent,
  view,
  gradientKey,
  svgRef,
}: CrystalStructureVisualProps) {
  const palette = accentPalettes[accent];
  const frame = createFrame(view);
  const nodes = createStructureNodes(view, accent);
  const connectorLines = createConnectorLines(view);
  const glowId = `${gradientKey}-structure-glow`;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 360 280"
      className="h-auto w-full max-w-[360px]"
      role="img"
      aria-label={`Crystal structure preview in ${view === "3d" ? "3D" : "orthographic"} view`}
    >
      <defs>
        <radialGradient id={glowId} cx="50%" cy="42%" r="50%">
          <stop offset="0%" stopColor={palette.glow} />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="138" rx="118" ry="86" fill={`url(#${glowId})`} />
      <ellipse cx="182" cy="230" rx="92" ry="18" fill={palette.shadow} opacity="0.26" />

      <polygon points={toPointsString(frame.back)} fill="none" stroke={hiddenFrameStroke} strokeDasharray="4 6" strokeWidth="1.2" />

      {connectorLines.map(([x1, y1, x2, y2], index) => (
        <line
          key={`${x1}-${y1}-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={index < 3 ? solidFrameStroke : hiddenFrameStroke}
          strokeDasharray={index < 3 ? undefined : "4 6"}
          strokeWidth="1"
        />
      ))}

      {nodes.map((node, index) => (
        <g key={`${node.x}-${node.y}-${index}`}>
          <circle cx={node.x} cy={node.y} r={node.radius} fill={node.fill} opacity={node.opacity} />
          <circle cx={node.x - node.radius * 0.2} cy={node.y - node.radius * 0.2} r={node.radius * 0.28} fill="rgba(255, 255, 255, 0.16)" />
        </g>
      ))}

      <polygon points={toPointsString(frame.front)} fill="none" stroke={solidFrameStroke} strokeWidth="1.2" />

      {[0, 1, 2, 3].map((index) => (
        <line
          key={`join-${index}`}
          x1={frame.back[index][0]}
          y1={frame.back[index][1]}
          x2={frame.front[index][0]}
          y2={frame.front[index][1]}
          stroke={solidFrameStroke}
          strokeWidth="1.1"
        />
      ))}
    </svg>
  );
}
