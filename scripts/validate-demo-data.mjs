import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(resolve(root, "data/cytosine-example.json"), "utf8"));

function countFormula(atoms) {
  const counts = new Map();
  for (const atom of atoms) {
    counts.set(atom.symbol, (counts.get(atom.symbol) ?? 0) + 1);
  }

  const symbols = counts.has("C")
    ? [
        "C",
        ...(counts.has("H") ? ["H"] : []),
        ...[...counts.keys()].filter((symbol) => symbol !== "C" && symbol !== "H").sort(),
      ]
    : [...counts.keys()].sort();

  return symbols
    .map((symbol) => `${symbol}${counts.get(symbol) > 1 ? counts.get(symbol) : ""}`)
    .join("");
}

function parseXyzBlock(block, label) {
  const lines = block.trim().split(/\r?\n/);
  const declaredCount = Number.parseInt(lines[0], 10);
  assert.ok(Number.isInteger(declaredCount) && declaredCount > 0, `${label}: invalid atom count`);
  assert.equal(lines.length, declaredCount + 2, `${label}: declared and parsed atom counts differ`);

  const atoms = lines.slice(2).map((line, index) => {
    const [symbol, xRaw, yRaw, zRaw, bodyIndexRaw] = line.trim().split(/\s+/);
    const x = Number(xRaw);
    const y = Number(yRaw);
    const z = Number(zRaw);
    assert.match(symbol ?? "", /^[A-Z][a-z]?$/, `${label}: invalid symbol on atom ${index + 1}`);
    assert.ok([x, y, z].every(Number.isFinite), `${label}: invalid coordinate on atom ${index + 1}`);
    return {
      symbol,
      x,
      y,
      z,
      bodyIndex: bodyIndexRaw === undefined ? undefined : Number(bodyIndexRaw),
    };
  });

  return { declaredCount, comment: lines[1], atoms };
}

function splitMultiXyz(text, label) {
  const lines = text.trim().split(/\r?\n/);
  const blocks = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const count = Number.parseInt(lines[cursor], 10);
    assert.ok(Number.isInteger(count) && count > 0, `${label}: invalid block at line ${cursor + 1}`);
    const end = cursor + count + 2;
    assert.ok(end <= lines.length, `${label}: truncated XYZ block at line ${cursor + 1}`);
    blocks.push(lines.slice(cursor, end).join("\n"));
    cursor = end;
  }

  return blocks;
}

assert.equal(source.source.provider, "PubChem");
assert.equal(source.source.cid, 597);
assert.equal(source.formula, "C4H5N3O");
assert.equal(source.atomCount, 13);
assert.equal(source.atoms.length, source.atomCount);
assert.equal(countFormula(source.atoms), source.formula);

const expectedValence = { H: 1, C: 4, N: 3, O: 2 };
const valence = new Array(source.atoms.length).fill(0);
for (const bond of source.bonds) {
  assert.ok(bond.from >= 1 && bond.from <= source.atoms.length, "bond source index is invalid");
  assert.ok(bond.to >= 1 && bond.to <= source.atoms.length, "bond target index is invalid");
  assert.ok(bond.order === 1 || bond.order === 2 || bond.order === 3, "bond order is invalid");
  valence[bond.from - 1] += bond.order;
  valence[bond.to - 1] += bond.order;
}

source.atoms.forEach((atom, index) => {
  assert.equal(valence[index], expectedValence[atom.symbol], `unexpected valence for atom ${index + 1}`);
});

for (const relativePath of [
  "public/demo/cytosine.xyz",
  "public/demo/sample_input.xyz",
  "backend/docs/molflow-backend/examples/cytosine.xyz",
]) {
  const fixture = parseXyzBlock(readFileSync(resolve(root, relativePath), "utf8"), relativePath);
  assert.equal(fixture.declaredCount, source.atomCount, `${relativePath}: wrong atom count`);
  assert.equal(countFormula(fixture.atoms), source.formula, `${relativePath}: wrong formula`);
  assert.match(fixture.comment, /PubChem CID 597/, `${relativePath}: missing provenance`);

  fixture.atoms.forEach((atom, index) => {
    const expected = source.atoms[index];
    assert.equal(atom.symbol, expected.symbol, `${relativePath}: symbol mismatch at atom ${index + 1}`);
    assert.ok(Math.abs(atom.x - expected.x) < 1e-6, `${relativePath}: x mismatch at atom ${index + 1}`);
    assert.ok(Math.abs(atom.y - expected.y) < 1e-6, `${relativePath}: y mismatch at atom ${index + 1}`);
    assert.ok(Math.abs(atom.z - expected.z) < 1e-6, `${relativePath}: z mismatch at atom ${index + 1}`);
  });
}

const galleryPath = resolve(root, "public/demo/cytosine_crystals_z2.xyz");
const galleryBlocks = splitMultiXyz(readFileSync(galleryPath, "utf8"), "Z=2 gallery");
assert.equal(galleryBlocks.length, 6, "Z=2 gallery should contain the six accepted structures");

galleryBlocks.forEach((block, index) => {
  const candidate = parseXyzBlock(block, `Z=2 candidate ${index + 1}`);
  assert.equal(candidate.declaredCount, source.atomCount * 2, "Z=2 candidate has wrong atom count");
  assert.equal(countFormula(candidate.atoms), "C8H10N6O2", "Z=2 candidate has wrong cell formula");
  assert.match(candidate.comment, /Z=2/);
  assert.match(candidate.comment, /'potential_model':'uma-s-1p2'/);
  assert.match(candidate.comment, /'optimization_steps':10/);
  assert.match(candidate.comment, /'optimization_type':'rigid-body'/);
  assert.match(candidate.comment, /'optimized':true/);
  assert.match(candidate.comment, new RegExp(`'rank':${index + 1}(?:[,}])`));

  const bodies = new Map();
  for (const atom of candidate.atoms) {
    assert.ok(Number.isInteger(atom.bodyIndex), "gallery atom is missing a molecular body index");
    const body = bodies.get(atom.bodyIndex) ?? [];
    body.push(atom);
    bodies.set(atom.bodyIndex, body);
  }

  assert.equal(bodies.size, 2, "Z=2 candidate must contain two molecular bodies");
  for (const atoms of bodies.values()) {
    assert.equal(atoms.length, source.atomCount, "gallery molecular body has wrong atom count");
    assert.equal(countFormula(atoms), source.formula, "gallery molecular body is not cytosine");
  }
});

assert.equal(existsSync(resolve(root, "public/demo/crystals_z4.xyz")), false, "rejected Z=4 gallery must not be published");

console.log("Cytosine demo data validation passed.");
