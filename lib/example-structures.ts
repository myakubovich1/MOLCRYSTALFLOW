import type { ExampleStructure } from "@/lib/types";
import { EXAMPLE_MOLECULE } from "@/lib/example-molecule";
import { buildFormula, parseLatticeFromComment, parseXyzText, splitMultiXyzText } from "@/lib/xyz";

interface DemoSource {
  file: string;
  zValue: number;
}

const DEMO_SOURCES: DemoSource[] = [
  { file: "/demo/cytosine_crystals_z2.xyz", zValue: 2 },
];

const MAX_EXAMPLE_STRUCTURES_PER_Z = 10;

function parseStructuresFromXyz(rawText: string, zValue: number, startIndex: number): ExampleStructure[] {
  const blocks = splitMultiXyzText(rawText).slice(0, MAX_EXAMPLE_STRUCTURES_PER_Z);

  return blocks.map((block, i) => {
    const parsed = parseXyzText(block);
    const commentLine = block.split(/\r?\n/)[1] ?? "";
    const lattice = parseLatticeFromComment(commentLine);

    return {
      index: startIndex + i,
      zValue,
      atomCount: parsed.atomCount,
      formula: parsed.formula || buildFormula(parsed.atoms),
      lattice: lattice ?? { a: 0, b: 0, c: 0, alpha: 0, beta: 0, gamma: 0, volume: 0 },
      xyzText: block,
    };
  });
}

let cachedStructures: ExampleStructure[] | null = null;

export async function loadExampleStructures(): Promise<ExampleStructure[]> {
  if (cachedStructures) return cachedStructures;

  const allStructures: ExampleStructure[] = [];
  let globalIndex = 0;

  for (const source of DEMO_SOURCES) {
    try {
      const response = await fetch(source.file, { cache: "force-cache" });
      if (!response.ok) continue;

      const rawText = await response.text();
      const structures = parseStructuresFromXyz(rawText, source.zValue, globalIndex);
      allStructures.push(...structures);
      globalIndex += structures.length;
    } catch {
      // Skip unavailable files
    }
  }

  cachedStructures = allStructures;
  return allStructures;
}

export function getExampleMoleculeInfo() {
  return {
    name: EXAMPLE_MOLECULE.name,
    formula: EXAMPLE_MOLECULE.formula,
    inputAtoms: EXAMPLE_MOLECULE.atomCount,
  };
}
