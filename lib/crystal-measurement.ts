import type { LatticeVectors, Vector3Tuple } from "@/lib/types";

export interface PeriodicDistanceResult {
  distance: number;
  imageShift: [number, number, number];
}

function subtract(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function norm(vector: Vector3Tuple) {
  return Math.sqrt(vector.reduce((sum, component) => sum + component * component, 0));
}

function cross(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

function determinant(matrix: [Vector3Tuple, Vector3Tuple, Vector3Tuple]) {
  const [a, b, c] = matrix;
  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  );
}

function inverse(
  matrix: [Vector3Tuple, Vector3Tuple, Vector3Tuple],
): [Vector3Tuple, Vector3Tuple, Vector3Tuple] {
  const [a, b, c] = matrix;
  const value = determinant(matrix);
  if (Math.abs(value) < 1e-10) throw new Error("Cell matrix is singular.");

  return [
    [
      (b[1] * c[2] - b[2] * c[1]) / value,
      (a[2] * c[1] - a[1] * c[2]) / value,
      (a[1] * b[2] - a[2] * b[1]) / value,
    ],
    [
      (b[2] * c[0] - b[0] * c[2]) / value,
      (a[0] * c[2] - a[2] * c[0]) / value,
      (a[2] * b[0] - a[0] * b[2]) / value,
    ],
    [
      (b[0] * c[1] - b[1] * c[0]) / value,
      (a[1] * c[0] - a[0] * c[1]) / value,
      (a[0] * b[1] - a[1] * b[0]) / value,
    ],
  ];
}

function matrixVector(
  matrix: [Vector3Tuple, Vector3Tuple, Vector3Tuple],
  vector: Vector3Tuple,
): Vector3Tuple {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];
}

function periodicDistanceForShift(
  fractional: Vector3Tuple,
  shift: [number, number, number],
  cell: [Vector3Tuple, Vector3Tuple, Vector3Tuple],
) {
  const wrapped: Vector3Tuple = [
    fractional[0] - shift[0],
    fractional[1] - shift[1],
    fractional[2] - shift[2],
  ];
  return norm([
    wrapped[0] * cell[0][0] + wrapped[1] * cell[1][0] + wrapped[2] * cell[2][0],
    wrapped[0] * cell[0][1] + wrapped[1] * cell[1][1] + wrapped[2] * cell[2][1],
    wrapped[0] * cell[0][2] + wrapped[1] * cell[1][2] + wrapped[2] * cell[2][2],
  ]);
}

export function cartesianDistance(left: Vector3Tuple, right: Vector3Tuple) {
  return norm(subtract(left, right));
}

export function minimumPeriodicDistance(
  left: Vector3Tuple,
  right: Vector3Tuple,
  vectors: LatticeVectors,
): PeriodicDistanceResult {
  const cell: [Vector3Tuple, Vector3Tuple, Vector3Tuple] = [
    vectors.a,
    vectors.b,
    vectors.c,
  ];
  const cellTranspose: [Vector3Tuple, Vector3Tuple, Vector3Tuple] = [
    [vectors.a[0], vectors.b[0], vectors.c[0]],
    [vectors.a[1], vectors.b[1], vectors.c[1]],
    [vectors.a[2], vectors.b[2], vectors.c[2]],
  ];
  const fractional = matrixVector(inverse(cellTranspose), subtract(left, right));
  const nearest: [number, number, number] = [
    Math.round(fractional[0]),
    Math.round(fractional[1]),
    Math.round(fractional[2]),
  ];

  let bestDistance = Number.POSITIVE_INFINITY;
  let bestShift: [number, number, number] = nearest;

  const consider = (shift: [number, number, number]) => {
    const distance = periodicDistanceForShift(fractional, shift, cell);
    if (distance + 1e-12 < bestDistance) {
      bestDistance = distance;
      bestShift = shift;
      return true;
    }
    return false;
  };

  for (let a = -1; a <= 1; a += 1) {
    for (let b = -1; b <= 1; b += 1) {
      for (let c = -1; c <= 1; c += 1) {
        consider([nearest[0] + a, nearest[1] + b, nearest[2] + c]);
      }
    }
  }

  for (let iteration = 0; iteration < 100; iteration += 1) {
    let improved = false;
    const current = bestShift;
    for (let a = -1; a <= 1; a += 1) {
      for (let b = -1; b <= 1; b += 1) {
        for (let c = -1; c <= 1; c += 1) {
          improved = consider([current[0] + a, current[1] + b, current[2] + c]) || improved;
        }
      }
    }
    if (!improved) break;
  }

  const volume = Math.abs(determinant(cell));
  const faceAreas = [
    norm(cross(cell[1], cell[2])),
    norm(cross(cell[0], cell[2])),
    norm(cross(cell[0], cell[1])),
  ];
  if (volume < 1e-10 || faceAreas.some((area) => area < 1e-10)) {
    throw new Error("Cell matrix is singular.");
  }

  const heights = faceAreas.map((area) => volume / area);
  const ranges = fractional.map((component, index) => {
    const span = bestDistance / heights[index];
    return {
      start: Math.floor(component - span) - 1,
      end: Math.ceil(component + span) + 1,
    };
  });
  const translationCount = ranges.reduce(
    (count, range) => count * (range.end - range.start + 1),
    1,
  );
  if (translationCount > 250_000) {
    throw new Error(
      `Cell is too skewed for bounded periodic measurement (${translationCount} translations required).`,
    );
  }

  for (let a = ranges[0].start; a <= ranges[0].end; a += 1) {
    for (let b = ranges[1].start; b <= ranges[1].end; b += 1) {
      for (let c = ranges[2].start; c <= ranges[2].end; c += 1) {
        consider([a, b, c]);
      }
    }
  }

  return { distance: bestDistance, imageShift: bestShift };
}
