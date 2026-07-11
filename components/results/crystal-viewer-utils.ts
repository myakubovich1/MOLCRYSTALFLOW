import type { LatticeVectors, Vector3Tuple } from "@/lib/types";
import { buildLatticeCorners } from "@/lib/xyz";

export type CrystalStyleMode = "ball-stick" | "spacefill" | "sticks";
export type CrystalPackingMode = "cell" | "packing";
export type CrystalProjectionMode = "perspective" | "orthographic";

export type CrystalViewer = {
  addLine: (spec?: Record<string, unknown>) => unknown;
  setStyle: (sel: Record<string, unknown>, style?: Record<string, unknown>) => unknown;
  setProjection: (projection: CrystalProjectionMode) => unknown;
};

export const crystalPackingRepeats: Record<CrystalPackingMode, { a: number; b: number; c: number }> = {
  cell: { a: 1, b: 1, c: 1 },
  packing: { a: 2, b: 2, c: 1 },
};

function toPoint([x, y, z]: Vector3Tuple) {
  return { x, y, z };
}

function addVectors(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVector(vector: Vector3Tuple, scale: number): Vector3Tuple {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function translateVector(vector: Vector3Tuple, offset: Vector3Tuple): Vector3Tuple {
  return [vector[0] + offset[0], vector[1] + offset[1], vector[2] + offset[2]];
}

function drawUnitCell(viewer: CrystalViewer, vectors: LatticeVectors, offset: Vector3Tuple = [0, 0, 0]) {
  const corners = buildLatticeCorners(vectors).map((corner) => translateVector(corner, offset));
  const edges: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7],
  ];

  edges.forEach(([startIndex, endIndex]) => {
    viewer.addLine({
      start: toPoint(corners[startIndex]),
      end: toPoint(corners[endIndex]),
      color: "#475569",
      opacity: 0.62,
    });
  });
}

export function drawCrystalLattice(
  viewer: CrystalViewer,
  vectors: LatticeVectors,
  repeats: { a: number; b: number; c: number },
) {
  for (let ai = 0; ai < repeats.a; ai += 1) {
    for (let bi = 0; bi < repeats.b; bi += 1) {
      for (let ci = 0; ci < repeats.c; ci += 1) {
        const offset = addVectors(
          addVectors(scaleVector(vectors.a, ai), scaleVector(vectors.b, bi)),
          scaleVector(vectors.c, ci),
        );
        drawUnitCell(viewer, vectors, offset);
      }
    }
  }
}

export function getCrystalStyleSpec(styleMode: CrystalStyleMode) {
  if (styleMode === "spacefill") {
    return {
      sphere: { scale: 0.72, colorscheme: "Jmol", opacity: 0.86 },
    };
  }

  if (styleMode === "sticks") {
    return {
      stick: { radius: 0.13, colorscheme: "Jmol" },
    };
  }

  return {
    stick: { radius: 0.16, colorscheme: "Jmol" },
    sphere: { scale: 0.25, colorscheme: "Jmol" },
  };
}

export function formatLatticeMetric(value?: number, suffix = "") {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "N/A";
}
