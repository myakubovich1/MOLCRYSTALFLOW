import cytosineData from "@/data/cytosine-example.json";
import type { AtomCoordinate } from "@/lib/types";
import { atomCoordinatesToXyzText } from "@/lib/xyz";

export const CYTOSINE_ATOMS: AtomCoordinate[] = cytosineData.atoms.map((atom) => ({
  symbol: atom.symbol,
  x: atom.x,
  y: atom.y,
  z: atom.z,
}));

export const EXAMPLE_MOLECULE = {
  name: cytosineData.name,
  formula: cytosineData.formula,
  atomCount: cytosineData.atomCount,
  xyzUrl: "/demo/cytosine.xyz",
  source: cytosineData.source,
} as const;

export const CYTOSINE_XYZ = atomCoordinatesToXyzText(
  CYTOSINE_ATOMS,
  cytosineData.comment,
);
