import type { ParsedAtom, XyzParseResult } from "@/lib/types";

function normalizeSymbol(raw: string) {
  const letters = raw.replace(/[^a-z]/gi, "");

  if (!letters) {
    return "";
  }

  return letters[0].toUpperCase() + letters.slice(1).toLowerCase();
}

function buildFormula(atoms: ParsedAtom[]) {
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

export function parseXyzFile(contents: string): XyzParseResult {
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

      const symbol = normalizeSymbol(parts[0] ?? "");
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
