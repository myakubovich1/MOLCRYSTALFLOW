import type { AtomCoordinate, ParsedAtom, XyzParseResult } from "@/lib/types";

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
    (!Number.isNaN(declaredCount) ? Math.abs(declaredCount - atoms.length) <= 2 : true);

  return {
    atomCount: atoms.length,
    formula: atoms.length ? buildFormula(atoms) : "",
    atoms,
    isValid,
    commentLine,
  };
}

export const parseXyzFile = parseXyzText;

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
