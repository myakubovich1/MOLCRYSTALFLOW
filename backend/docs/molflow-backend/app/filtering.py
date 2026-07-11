from collections import Counter
from dataclasses import dataclass
import json
from math import acos, isfinite, pi, sqrt
from pathlib import Path
import re
import shutil
from typing import Any

from .config import POTENTIAL_MODEL, POTENTIAL_PROVIDER, RIGID_BODY_STEPS, UMA_MODEL
from .potential import PotentialEvaluator
from .utils import ensure_dir, write_json


VDW_RADII = {
    "H": 1.20,
    "He": 1.40,
    "Li": 1.82,
    "Be": 1.53,
    "B": 1.92,
    "C": 1.70,
    "N": 1.55,
    "O": 1.52,
    "F": 1.47,
    "Ne": 1.54,
    "Na": 2.27,
    "Mg": 1.73,
    "Al": 1.84,
    "Si": 2.10,
    "P": 1.80,
    "S": 1.80,
    "Cl": 1.75,
    "Ar": 1.88,
    "K": 2.75,
    "Ca": 2.31,
    "Br": 1.85,
    "I": 1.98,
}

ATOMIC_MASSES = {
    "H": 1.008,
    "He": 4.0026,
    "Li": 6.94,
    "Be": 9.0122,
    "B": 10.81,
    "C": 12.011,
    "N": 14.007,
    "O": 15.999,
    "F": 18.998,
    "Ne": 20.180,
    "Na": 22.990,
    "Mg": 24.305,
    "Al": 26.982,
    "Si": 28.085,
    "P": 30.974,
    "S": 32.06,
    "Cl": 35.45,
    "Ar": 39.948,
    "K": 39.098,
    "Ca": 40.078,
    "Br": 79.904,
    "I": 126.904,
}

LATTICE_PATTERN = re.compile(r'Lattice="([^"]+)"')
PROPERTIES_PATTERN = re.compile(r'Properties=("[^"]+"|\S+)')


@dataclass
class AtomRecord:
    symbol: str
    position: tuple[float, float, float]
    molecule_index: int


@dataclass
class CandidateStructure:
    z_value: int
    source_index: int
    comment: str
    atoms: list[AtomRecord]
    cell: list[tuple[float, float, float]]
    raw_text: str


def _determinant(cell: list[tuple[float, float, float]]) -> float:
    a, b, c = cell
    return (
        a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])
    )


def _inverse(matrix: list[list[float]]) -> list[list[float]]:
    a, b, c = matrix[0]
    d, e, f = matrix[1]
    g, h, i = matrix[2]
    determinant = (
        a * (e * i - f * h)
        - b * (d * i - f * g)
        + c * (d * h - e * g)
    )
    if abs(determinant) < 1e-10:
        raise ValueError("Cell matrix is singular.")

    return [
        [(e * i - f * h) / determinant, (c * h - b * i) / determinant, (b * f - c * e) / determinant],
        [(f * g - d * i) / determinant, (a * i - c * g) / determinant, (c * d - a * f) / determinant],
        [(d * h - e * g) / determinant, (b * g - a * h) / determinant, (a * e - b * d) / determinant],
    ]


def _matrix_vector(matrix: list[list[float]], vector: tuple[float, float, float]) -> tuple[float, float, float]:
    return (
        matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
        matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
        matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
    )


def _minimum_image_distance(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
    cell: list[tuple[float, float, float]],
    inverse_cell_transpose: list[list[float]],
) -> float:
    displacement = (
        left[0] - right[0],
        left[1] - right[1],
        left[2] - right[2],
    )
    fractional = _matrix_vector(inverse_cell_transpose, displacement)
    nearest = tuple(round(value) for value in fractional)
    minimum_distance = float("inf")

    # Component-wise wrapping alone is not guaranteed to find the nearest image
    # in a skewed triclinic cell. Search the neighboring images around it.
    for a_shift in (-1, 0, 1):
        for b_shift in (-1, 0, 1):
            for c_shift in (-1, 0, 1):
                wrapped = (
                    fractional[0] - nearest[0] - a_shift,
                    fractional[1] - nearest[1] - b_shift,
                    fractional[2] - nearest[2] - c_shift,
                )
                cartesian = (
                    wrapped[0] * cell[0][0] + wrapped[1] * cell[1][0] + wrapped[2] * cell[2][0],
                    wrapped[0] * cell[0][1] + wrapped[1] * cell[1][1] + wrapped[2] * cell[2][1],
                    wrapped[0] * cell[0][2] + wrapped[1] * cell[1][2] + wrapped[2] * cell[2][2],
                )
                distance = sqrt(
                    cartesian[0] ** 2 + cartesian[1] ** 2 + cartesian[2] ** 2
                )
                minimum_distance = min(minimum_distance, distance)

    return minimum_distance


def _property_offsets(comment: str) -> dict[str, tuple[int, int]]:
    match = PROPERTIES_PATTERN.search(comment)
    if not match:
        return {}

    specification = match.group(1).strip('"')
    fields = specification.split(":")
    if len(fields) % 3 != 0:
        return {}

    offsets: dict[str, tuple[int, int]] = {}
    offset = 0
    for index in range(0, len(fields), 3):
        name = fields[index]
        try:
            width = int(fields[index + 2])
        except ValueError:
            return {}
        offsets[name] = (offset, width)
        offset += width
    return offsets


def split_multi_xyz(contents: str) -> list[str]:
    lines = contents.splitlines()
    structures: list[str] = []
    index = 0

    while index < len(lines):
        while index < len(lines) and not lines[index].strip():
            index += 1
        if index >= len(lines):
            break

        try:
            atom_count = int(lines[index].strip())
        except ValueError as error:
            raise ValueError(f"Invalid XYZ atom count at line {index + 1}.") from error

        end = index + atom_count + 2
        if atom_count <= 0 or end > len(lines):
            raise ValueError(f"Incomplete XYZ structure at line {index + 1}.")
        structures.append("\n".join(lines[index:end]) + "\n")
        index = end

    return structures


def parse_candidate(block: str, z_value: int, source_index: int) -> CandidateStructure:
    lines = block.splitlines()
    atom_count = int(lines[0].strip())
    comment = lines[1]

    lattice_match = LATTICE_PATTERN.search(comment)
    if not lattice_match:
        raise ValueError("Missing Lattice metadata.")

    lattice_values = [float(value) for value in lattice_match.group(1).split()]
    if len(lattice_values) != 9 or not all(isfinite(value) for value in lattice_values):
        raise ValueError("Lattice metadata must contain nine finite values.")

    cell = [
        tuple(lattice_values[0:3]),
        tuple(lattice_values[3:6]),
        tuple(lattice_values[6:9]),
    ]
    offsets = _property_offsets(comment)
    species_offset = offsets.get("species", (0, 1))[0]
    position_offset, position_width = offsets.get("pos", (1, 3))
    bb_offset = offsets.get("bb_indices", (4, 1))[0]
    if position_width != 3:
        raise ValueError("Position metadata must contain three coordinates.")

    atoms: list[AtomRecord] = []
    for row_index, line in enumerate(lines[2 : atom_count + 2], start=1):
        fields = line.split()
        try:
            symbol = fields[species_offset]
            position = (
                float(fields[position_offset]),
                float(fields[position_offset + 1]),
                float(fields[position_offset + 2]),
            )
            molecule_index = int(fields[bb_offset])
        except (IndexError, ValueError) as error:
            raise ValueError(f"Invalid atom row {row_index}.") from error

        if not re.fullmatch(r"[A-Z][a-z]?", symbol):
            raise ValueError(f"Invalid element symbol {symbol!r}.")
        if not all(isfinite(value) for value in position):
            raise ValueError(f"Atom row {row_index} contains non-finite coordinates.")
        atoms.append(AtomRecord(symbol, position, molecule_index))

    if len(atoms) != atom_count:
        raise ValueError("XYZ atom count does not match the number of atom rows.")

    return CandidateStructure(
        z_value=z_value,
        source_index=source_index,
        comment=comment,
        atoms=atoms,
        cell=cell,
        raw_text=block,
    )


def _cell_parameters(cell: list[tuple[float, float, float]]) -> dict[str, float]:
    lengths = [sqrt(sum(component * component for component in vector)) for vector in cell]

    def angle(left: tuple[float, float, float], right: tuple[float, float, float], denominator: float) -> float:
        cosine = sum(left[index] * right[index] for index in range(3)) / denominator
        return acos(max(-1.0, min(1.0, cosine))) * 180.0 / pi

    return {
        "a": lengths[0],
        "b": lengths[1],
        "c": lengths[2],
        "alpha": angle(cell[1], cell[2], lengths[1] * lengths[2]),
        "beta": angle(cell[0], cell[2], lengths[0] * lengths[2]),
        "gamma": angle(cell[0], cell[1], lengths[0] * lengths[1]),
        "volume": abs(_determinant(cell)),
    }


def _serialize_candidate(
    candidate: CandidateStructure,
    positions: list[tuple[float, float, float]] | None = None,
    cell: list[tuple[float, float, float]] | None = None,
    metadata: dict[str, Any] | None = None,
) -> str:
    resolved_cell = cell or candidate.cell
    lattice = " ".join(f"{component:.12g}" for vector in resolved_cell for component in vector)
    base_comment = LATTICE_PATTERN.sub(f'Lattice="{lattice}"', candidate.comment)
    if metadata:
        encoded = json.dumps(metadata, separators=(",", ":"), sort_keys=True)
        base_comment = f'{base_comment} molflow_filter="{encoded.replace(chr(34), chr(39))}"'

    resolved_positions = positions or [atom.position for atom in candidate.atoms]
    rows = [
        f"{atom.symbol:<2} {position[0]: .10f} {position[1]: .10f} {position[2]: .10f} {atom.molecule_index}"
        for atom, position in zip(candidate.atoms, resolved_positions)
    ]
    return "\n".join([str(len(candidate.atoms)), base_comment, *rows]) + "\n"


def analyze_geometry(
    candidate: CandidateStructure,
    input_atom_count: int,
    options: dict[str, Any],
) -> dict[str, Any]:
    reasons: list[str] = []
    expected_atom_count = input_atom_count * candidate.z_value
    molecule_counts = Counter(atom.molecule_index for atom in candidate.atoms)
    cell_parameters: dict[str, float] | None = None

    if len(candidate.atoms) != expected_atom_count:
        reasons.append(
            f"Expected {expected_atom_count} atoms for Z={candidate.z_value}, found {len(candidate.atoms)}."
        )

    if len(molecule_counts) != candidate.z_value:
        reasons.append(
            f"Expected {candidate.z_value} bb_indices groups, found {len(molecule_counts)}."
        )
    if any(count != input_atom_count for count in molecule_counts.values()):
        reasons.append("One or more bb_indices groups has the wrong molecule size.")

    try:
        cell_parameters = _cell_parameters(candidate.cell)
        if cell_parameters["volume"] <= 1.0:
            reasons.append("Cell volume is too small or singular.")
        if min(cell_parameters["a"], cell_parameters["b"], cell_parameters["c"]) <= 1.0:
            reasons.append("One or more cell vectors is too short.")
        inverse_cell_transpose = _inverse(
            [
                [candidate.cell[0][0], candidate.cell[1][0], candidate.cell[2][0]],
                [candidate.cell[0][1], candidate.cell[1][1], candidate.cell[2][1]],
                [candidate.cell[0][2], candidate.cell[1][2], candidate.cell[2][2]],
            ]
        )
    except (ValueError, ZeroDivisionError):
        inverse_cell_transpose = None
        reasons.append("Cell matrix is singular or invalid.")

    minimum_distance: float | None = None
    minimum_ratio: float | None = None
    intermolecular_pairs = 0
    clash_count = 0
    close_contact_count = 0
    threshold = float(options.get("clashThresholdRatio", 0.65))

    if inverse_cell_transpose is not None:
        for left_index, left in enumerate(candidate.atoms):
            for right in candidate.atoms[left_index + 1 :]:
                if left.molecule_index == right.molecule_index:
                    continue
                distance = _minimum_image_distance(
                    left.position,
                    right.position,
                    candidate.cell,
                    inverse_cell_transpose,
                )
                radius_sum = VDW_RADII.get(left.symbol, 1.8) + VDW_RADII.get(right.symbol, 1.8)
                ratio = distance / radius_sum
                intermolecular_pairs += 1
                minimum_distance = distance if minimum_distance is None else min(minimum_distance, distance)
                minimum_ratio = ratio if minimum_ratio is None else min(minimum_ratio, ratio)
                if ratio < threshold:
                    clash_count += 1
                if ratio < 0.8:
                    close_contact_count += 1

    clash_rate = clash_count / intermolecular_pairs if intermolecular_pairs else 0.0
    if clash_count > int(options.get("maxClashCount", 0)):
        reasons.append(
            f"Found {clash_count} intermolecular clashes below {threshold:.3f} times the van der Waals radii sum."
        )

    volume = cell_parameters["volume"] if cell_parameters else None
    total_mass = sum(ATOMIC_MASSES.get(atom.symbol, 0.0) for atom in candidate.atoms)
    density = total_mass * 1.66053906660 / volume if volume and total_mass else None
    min_density = options.get("minDensityGcm3")
    max_density = options.get("maxDensityGcm3")
    if density is not None and min_density is not None and density < float(min_density):
        reasons.append(f"Density {density:.3f} g/cm3 is below the configured minimum.")
    if density is not None and max_density is not None and density > float(max_density):
        reasons.append(f"Density {density:.3f} g/cm3 is above the configured maximum.")

    return {
        "geometryPassed": not reasons,
        "reasons": reasons,
        "atomCount": len(candidate.atoms),
        "moleculeCount": len(molecule_counts),
        "cell": cell_parameters,
        "densityGcm3": density,
        "minimumIntermolecularDistanceAngstrom": minimum_distance,
        "minimumVdwRatio": minimum_ratio,
        "intermolecularPairCount": intermolecular_pairs,
        "clashCount": clash_count,
        "closeContactCount": close_contact_count,
        "clashRate": clash_rate,
    }


def _artifact_info(path: Path) -> dict[str, Any]:
    return {"name": path.name, "sizeBytes": path.stat().st_size}


def process_generated_outputs(
    generated_dir: Path,
    artifacts_dir: Path,
    input_atom_count: int,
    z_values: list[int],
    options: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    ensure_dir(artifacts_dir)
    candidates: list[dict[str, Any]] = []
    candidate_objects: dict[str, CandidateStructure] = {}
    missing_sources: list[str] = []

    raw_combined = generated_dir / "pred_combined.xyz"
    if raw_combined.exists():
        shutil.copy2(raw_combined, artifacts_dir / "raw_pred_combined.xyz")

    for z_value in z_values:
        source_path = generated_dir / f"crystals_z{z_value}.xyz"
        if not source_path.exists():
            missing_sources.append(source_path.name)
            continue

        shutil.copy2(source_path, artifacts_dir / f"raw_crystals_z{z_value}.xyz")
        for source_index, block in enumerate(split_multi_xyz(source_path.read_text(errors="ignore"))):
            candidate_id = f"z{z_value}-{source_index + 1:04d}"
            entry: dict[str, Any] = {
                "id": candidate_id,
                "zValue": z_value,
                "sourceIndex": source_index,
                "status": "pending",
                "accepted": False,
                "reasons": [],
            }
            try:
                candidate = parse_candidate(block, z_value, source_index)
                candidate_objects[candidate_id] = candidate
                if options.get("geometryEnabled", True):
                    entry.update(analyze_geometry(candidate, input_atom_count, options))
                else:
                    entry.update(
                        {
                            "geometryPassed": True,
                            "atomCount": len(candidate.atoms),
                            "moleculeCount": len(set(atom.molecule_index for atom in candidate.atoms)),
                        }
                    )
            except Exception as error:
                entry.update(
                    {
                        "geometryPassed": False,
                        "reasons": [f"Could not parse or validate candidate: {error}"],
                    }
                )
            candidates.append(entry)

    if missing_sources:
        raise ValueError(
            "Generator did not produce expected candidate files: "
            + ", ".join(missing_sources)
        )

    energy_filter_requested = bool(options.get("energyEnabled", False))
    uma_ranking_enabled = POTENTIAL_PROVIDER == "uma"
    scoring_enabled = energy_filter_requested or uma_ranking_enabled
    potential_model = UMA_MODEL if uma_ranking_enabled else POTENTIAL_MODEL
    evaluator: PotentialEvaluator | None = None
    evaluator_error: str | None = None
    if scoring_enabled:
        try:
            evaluator = PotentialEvaluator()
        except Exception as error:
            evaluator_error = str(error)

    potential_attempted = 0
    potential_failed = 0
    scored_by_z: dict[int, list[dict[str, Any]]] = {}
    ranked_entries: list[dict[str, Any]] = []
    relaxed_structures: dict[str, tuple[list[tuple[float, float, float]], list[tuple[float, float, float]]]] = {}

    for entry in candidates:
        if not entry.get("geometryPassed"):
            entry["status"] = "geometry_rejected"
            continue

        if not scoring_enabled:
            entry["status"] = "accepted"
            entry["accepted"] = True
            continue

        candidate = candidate_objects[entry["id"]]
        entry.update(
            {
                "potentialProvider": POTENTIAL_PROVIDER if POTENTIAL_PROVIDER != "none" else None,
                "potentialModel": potential_model if POTENTIAL_PROVIDER != "none" else None,
                "optimizationType": "rigid-body" if uma_ranking_enabled else None,
                "optimizationSteps": RIGID_BODY_STEPS if uma_ranking_enabled else 0,
                "optimized": False,
            }
        )

        if evaluator_error:
            potential_attempted += 1
            potential_failed += 1
            entry.update(
                {
                    "potentialStatus": "unavailable",
                    "rankingStatus": "unavailable" if uma_ranking_enabled else None,
                    "scoringError": evaluator_error,
                }
            )
            if uma_ranking_enabled:
                entry["status"] = "accepted"
                entry["accepted"] = True
            else:
                entry["status"] = "potential_failed"
                entry["reasons"].append(f"Potential evaluation failed: {evaluator_error}")
            continue

        potential_attempted += 1
        try:
            assert evaluator is not None
            result = evaluator.evaluate(
                symbols=[atom.symbol for atom in candidate.atoms],
                positions=[atom.position for atom in candidate.atoms],
                cell=candidate.cell,
                relaxation_steps=(
                    RIGID_BODY_STEPS
                    if uma_ranking_enabled
                    else int(options.get("relaxationSteps", 0))
                ),
                relaxation_fmax=float(options.get("relaxationFmaxEvPerAngstrom", 0.2)),
                molecule_indices=[atom.molecule_index for atom in candidate.atoms],
            )
            energy_per_molecule = result.energy_ev / candidate.z_value
            entry.update(
                {
                    "potentialStatus": "completed",
                    "rankingStatus": "scored" if uma_ranking_enabled else None,
                    "energyEv": result.energy_ev,
                    "energyEvPerMolecule": energy_per_molecule,
                    "energy": energy_per_molecule,
                    "energyUnits": "eV/molecule",
                    "maxForceEvPerAngstrom": result.max_force_ev_per_angstrom,
                    "optimized": result.optimized,
                    "optimizationType": result.optimization_type,
                    "optimizationSteps": result.optimization_steps,
                    "potentialProvider": result.potential_provider,
                    "potentialModel": result.potential_model,
                }
            )
            relaxed_structures[entry["id"]] = (result.positions, result.cell)

            if uma_ranking_enabled:
                entry["status"] = "accepted"
                entry["accepted"] = True
                ranked_entries.append(entry)
                continue

            max_force = options.get("maxForceEvPerAngstrom")
            if max_force is not None and result.max_force_ev_per_angstrom > float(max_force):
                entry["status"] = "force_rejected"
                entry["reasons"].append(
                    f"Maximum force {result.max_force_ev_per_angstrom:.3f} eV/A exceeds the configured limit."
                )
                continue

            scored_by_z.setdefault(candidate.z_value, []).append(entry)
        except Exception as error:
            potential_failed += 1
            entry.update(
                {
                    "potentialStatus": "failed",
                    "rankingStatus": "failed" if uma_ranking_enabled else None,
                    "scoringError": str(error),
                }
            )
            if uma_ranking_enabled:
                entry["status"] = "accepted"
                entry["accepted"] = True
            else:
                entry["status"] = "potential_failed"
                entry["reasons"].append(f"Potential evaluation failed: {error}")

    energy_rejected = 0
    if uma_ranking_enabled:
        ranked_entries.sort(
            key=lambda entry: (
                float(entry.get("energyEvPerMolecule", float("inf"))),
                int(entry["zValue"]),
                int(entry["sourceIndex"]),
            )
        )
        if ranked_entries:
            minimum_energy = min(float(entry["energyEvPerMolecule"]) for entry in ranked_entries)
            for rank, entry in enumerate(ranked_entries, start=1):
                relative_energy = float(entry["energyEvPerMolecule"]) - minimum_energy
                entry["rank"] = rank
                entry["relativeEnergyEvPerMolecule"] = relative_energy
                entry["rankingStatus"] = "ranked"
    elif energy_filter_requested:
        energy_window = options.get("maxRelativeEnergyEvPerMolecule")
        for scored_entries in scored_by_z.values():
            minimum_energy = min(float(entry["energyEvPerMolecule"]) for entry in scored_entries)
            for entry in scored_entries:
                relative_energy = float(entry["energyEvPerMolecule"]) - minimum_energy
                entry["relativeEnergyEvPerMolecule"] = relative_energy
                if energy_window is not None and relative_energy > float(energy_window):
                    energy_rejected += 1
                    entry["status"] = "energy_rejected"
                    entry["reasons"].append(
                        f"Relative energy {relative_energy:.4f} eV/molecule exceeds the configured window."
                    )
                else:
                    entry["status"] = "accepted"
                    entry["accepted"] = True

    accepted_by_z: dict[int, list[str]] = {}
    accepted_combined: list[str] = []
    def accepted_sort_key(entry: dict[str, Any]) -> tuple[int, int, int, float, int]:
        rank = entry.get("rank")
        if isinstance(rank, (int, float)):
            return (0, int(rank), int(entry["zValue"]), 0.0, int(entry["sourceIndex"]))
        return (
            1,
            int(entry["zValue"]),
            0,
            float(entry.get("relativeEnergyEvPerMolecule", float("inf"))),
            int(entry["sourceIndex"]),
        )

    accepted_entries = sorted(
        (entry for entry in candidates if entry.get("accepted")),
        key=accepted_sort_key,
    )
    for entry in accepted_entries:
        candidate = candidate_objects[entry["id"]]
        relaxed = relaxed_structures.get(entry["id"])
        structure_text = _serialize_candidate(
            candidate,
            positions=relaxed[0] if relaxed else None,
            cell=relaxed[1] if relaxed else None,
            metadata={
                "id": entry["id"],
                "rank": entry.get("rank"),
                "energy": entry.get("energy"),
                "energy_units": entry.get("energyUnits"),
                "energy_ev_per_molecule": entry.get("energyEvPerMolecule"),
                "relative_energy_ev_per_molecule": entry.get("relativeEnergyEvPerMolecule"),
                "minimum_vdw_ratio": entry.get("minimumVdwRatio"),
                "optimized": entry.get("optimized"),
                "optimization_type": entry.get("optimizationType"),
                "optimization_steps": entry.get("optimizationSteps"),
                "potential_provider": entry.get("potentialProvider"),
                "potential_model": entry.get("potentialModel"),
            },
        )
        bucket = accepted_by_z.setdefault(candidate.z_value, [])
        entry["acceptedIndex"] = len(bucket)
        bucket.append(structure_text)
        accepted_combined.append(structure_text)

    artifact_paths: list[Path] = []
    for z_value, structures in accepted_by_z.items():
        output_path = artifacts_dir / f"crystals_z{z_value}.xyz"
        output_path.write_text("".join(structures))
        artifact_paths.append(output_path)

    if accepted_combined:
        combined_path = artifacts_dir / "pred_combined.xyz"
        combined_path.write_text("".join(accepted_combined))
        artifact_paths.append(combined_path)

    summary = {
        "generatedCount": len(candidates),
        "geometryPassedCount": sum(bool(entry.get("geometryPassed")) for entry in candidates),
        "geometryRejectedCount": sum(entry.get("status") == "geometry_rejected" for entry in candidates),
        "clashRejectedCount": sum(
            entry.get("status") == "geometry_rejected" and int(entry.get("clashCount", 0)) > 0
            for entry in candidates
        ),
        "potentialAttemptedCount": potential_attempted,
        "potentialFailedCount": potential_failed,
        "potentialCrashRate": potential_failed / potential_attempted if potential_attempted else 0.0,
        "energyRejectedCount": energy_rejected,
        "energyRankedCount": len(ranked_entries),
        "energyRankingAvailable": bool(uma_ranking_enabled and evaluator_error is None),
        "energyRankingUnavailableReason": evaluator_error,
        "rankingMode": "uma-rigid-body" if uma_ranking_enabled else (
            "relative-energy-window" if energy_filter_requested else "none"
        ),
        "potentialProvider": POTENTIAL_PROVIDER if POTENTIAL_PROVIDER != "none" else None,
        "potentialModel": potential_model if POTENTIAL_PROVIDER != "none" else None,
        "rigidBodySteps": RIGID_BODY_STEPS if uma_ranking_enabled else None,
        "acceptedCount": sum(bool(entry.get("accepted")) for entry in candidates),
        "settings": options,
    }

    manifest_path = artifacts_dir / "candidates.json"
    write_json(
        manifest_path,
        {
            "schemaVersion": 1,
            "summary": summary,
            "candidates": candidates,
        },
    )
    artifact_paths.append(manifest_path)

    for raw_path in sorted(artifacts_dir.glob("raw_*.xyz")):
        artifact_paths.append(raw_path)

    unique_paths = list(dict.fromkeys(artifact_paths))
    return [_artifact_info(path) for path in unique_paths], summary
