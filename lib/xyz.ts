import type { AtomCoordinate, LatticeParameters, LatticeVectors, ParsedAtom, Vector3Tuple, XyzParseResult } from "@/lib/types";

export function normalizeAtomSymbol(raw: string) {
  const letters = raw.replace(/[^a-z]/gi, "");

  if (!letters) {
    return "";
  }

  return letters[0].toUpperCase() + letters.slice(1).toLowerCase();
}

export function buildFormula(atoms: ParsedAtom[]) {
  const counts = new Map<string, number>();

  atoms.forEach((atom) => {
    counts.set(atom.symbol, (counts.get(atom.symbol) ?? 0) + 1);
  });

  const orderedSymbols = counts.has("C")
    ? [
        "C",
        ...(counts.has("H") ? ["H"] : []),
        ...Array.from(counts.keys()).filter((symbol) => symbol !== "C" && symbol !== "H").sort(),
      ]
    : Array.from(counts.keys()).sort();

  return orderedSymbols
    .map((symbol) => {
      const count = counts.get(symbol) ?? 0;
      return `${symbol}${count > 1 ? count : ""}`;
    })
    .join("");
}

export function atomCoordinatesToXyzText(atoms: AtomCoordinate[], commentLine = "MolCrystalFlow normalized input") {
  const lines = atoms.map((atom) => `${atom.symbol} ${atom.x.toFixed(6)} ${atom.y.toFixed(6)} ${atom.z.toFixed(6)}`);
  return [String(atoms.length), commentLine, ...lines].join("\n");
}

export function parseXyzText(contents: string): XyzParseResult {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index) => !(index > 1 && line.length === 0));

  if (lines.length < 3) {
    return {
      atomCount: 0,
      formula: "",
      atoms: [],
      isValid: false,
    };
  }

  const declaredCount = Number.parseInt(lines[0] ?? "", 10);
  const commentLine = lines[1] ?? "";
  const atomLines = lines.slice(2);

  const atoms: ParsedAtom[] = atomLines
    .map((line) => {
      const parts = line.split(/\s+/);

      if (parts.length < 4) {
        return null;
      }

      const symbol = normalizeAtomSymbol(parts[0] ?? "");
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);

      if (!symbol || [x, y, z].some((value) => Number.isNaN(value))) {
        return null;
      }

      return { symbol, x, y, z };
    })
    .filter((atom): atom is ParsedAtom => atom !== null);

  const isValid =
    atoms.length > 0 &&
    (!Number.isNaN(declaredCount) ? declaredCount === atoms.length : false);

  return {
    atomCount: atoms.length,
    formula: atoms.length ? buildFormula(atoms) : "",
    atoms,
    isValid,
    commentLine,
    latticeVectors: parseLatticeVectorsFromComment(commentLine) ?? undefined,
    latticeParameters: parseLatticeFromComment(commentLine) ?? undefined,
  };
}

export const parseXyzFile = parseXyzText;

function getLatticeValuesFromComment(commentLine: string) {
  const match = commentLine.match(/Lattice="([^"]+)"/);
  if (!match) return null;

  const values = match[1].trim().split(/\s+/).map(Number);
  if (values.length !== 9 || values.some((v) => !Number.isFinite(v))) return null;

  return values;
}

export function parseLatticeVectorsFromComment(commentLine: string): LatticeVectors | null {
  const values = getLatticeValuesFromComment(commentLine);
  if (!values) return null;

  const [a1, a2, a3, b1, b2, b3, c1, c2, c3] = values;

  return {
    a: [a1, a2, a3],
    b: [b1, b2, b3],
    c: [c1, c2, c3],
  };
}

export function parseLatticeFromComment(commentLine: string): LatticeParameters | null {
  const values = getLatticeValuesFromComment(commentLine);
  if (!values) return null;

  // 3x3 matrix: rows are lattice vectors a, b, c
  const [a1, a2, a3, b1, b2, b3, c1, c2, c3] = values;

  const aLen = Math.sqrt(a1 * a1 + a2 * a2 + a3 * a3);
  const bLen = Math.sqrt(b1 * b1 + b2 * b2 + b3 * b3);
  const cLen = Math.sqrt(c1 * c1 + c2 * c2 + c3 * c3);

  const toDeg = 180 / Math.PI;
  const alpha = Math.acos((b1 * c1 + b2 * c2 + b3 * c3) / (bLen * cLen)) * toDeg;
  const beta = Math.acos((a1 * c1 + a2 * c2 + a3 * c3) / (aLen * cLen)) * toDeg;
  const gamma = Math.acos((a1 * b1 + a2 * b2 + a3 * b3) / (aLen * bLen)) * toDeg;

  // Volume = |a . (b x c)|
  const crossX = b2 * c3 - b3 * c2;
  const crossY = b3 * c1 - b1 * c3;
  const crossZ = b1 * c2 - b2 * c1;
  const volume = Math.abs(a1 * crossX + a2 * crossY + a3 * crossZ);

  return {
    a: Number(aLen.toFixed(3)),
    b: Number(bLen.toFixed(3)),
    c: Number(cLen.toFixed(3)),
    alpha: Number(alpha.toFixed(2)),
    beta: Number(beta.toFixed(2)),
    gamma: Number(gamma.toFixed(2)),
    volume: Number(volume.toFixed(1)),
  };
}

function addVectors(left: Vector3Tuple, right: Vector3Tuple): Vector3Tuple {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVector(vector: Vector3Tuple, scale: number): Vector3Tuple {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

export function buildLatticeCorners(vectors: LatticeVectors) {
  const origin: Vector3Tuple = [0, 0, 0];
  const ab = addVectors(vectors.a, vectors.b);
  const ac = addVectors(vectors.a, vectors.c);
  const bc = addVectors(vectors.b, vectors.c);
  const abc = addVectors(ab, vectors.c);

  return [origin, vectors.a, vectors.b, ab, vectors.c, ac, bc, abc];
}

export function buildReplicatedXyzText(
  structureText: string,
  options: { a: number; b: number; c: number },
) {
  const parsed = parseXyzText(structureText);

  if (!parsed.isValid || !parsed.latticeVectors || parsed.atoms.length === 0) {
    return structureText;
  }

  const replicatedAtoms: AtomCoordinate[] = [];

  for (let ai = 0; ai < options.a; ai += 1) {
    for (let bi = 0; bi < options.b; bi += 1) {
      for (let ci = 0; ci < options.c; ci += 1) {
        const offset = addVectors(
          addVectors(scaleVector(parsed.latticeVectors.a, ai), scaleVector(parsed.latticeVectors.b, bi)),
          scaleVector(parsed.latticeVectors.c, ci),
        );

        parsed.atoms.forEach((atom) => {
          replicatedAtoms.push({
            symbol: atom.symbol,
            x: atom.x + offset[0],
            y: atom.y + offset[1],
            z: atom.z + offset[2],
          });
        });
      }
    }
  }

  return atomCoordinatesToXyzText(
    replicatedAtoms,
    `${parsed.commentLine ?? "MolCrystalFlow candidate"} display="${options.a}x${options.b}x${options.c}"`,
  );
}

export function splitMultiXyzText(contents: string) {
  const rawLines = contents.split(/\r?\n/);
  const structures: string[] = [];
  let index = 0;

  while (index < rawLines.length) {
    while (index < rawLines.length && rawLines[index]?.trim().length === 0) {
      index += 1;
    }

    if (index >= rawLines.length) {
      break;
    }

    const declaredCount = Number.parseInt(rawLines[index]?.trim() ?? "", 10);

    if (!Number.isFinite(declaredCount) || declaredCount <= 0) {
      break;
    }

    const commentLine = rawLines[index + 1] ?? "";
    const atomLines = rawLines.slice(index + 2, index + 2 + declaredCount);

    if (atomLines.length < declaredCount) {
      break;
    }

    const block = [String(declaredCount), commentLine, ...atomLines].join("\n");
    const parsed = parseXyzText(block);

    if (parsed.isValid && parsed.atomCount > 0) {
      structures.push(block);
    }

    index += declaredCount + 2;
  }

  return structures;
}
