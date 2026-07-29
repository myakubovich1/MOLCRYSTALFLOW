from collections import Counter
from dataclasses import dataclass
import json
from math import acos, ceil, floor, isfinite, pi, sqrt
from pathlib import Path
import re
import shutil
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

from .config import (
    GENERATOR_BACKEND,
    POTENTIAL_MODEL,
    POTENTIAL_PROVIDER,
    RIGID_BODY_STEPS,
    UMA_MODEL,
    UMA_TASK_NAME,
    V2_FEATURE_MODE,
    V2_MODEL_NAME,
    V2_REQUIRE_EXACT_FEATURES,
)
from .potential import PotentialEvaluator
from .utils import ensure_dir, write_json
from .v2_auxiliary_features import FEATURE_LIMITATIONS as V2_INFERENCE_KIT_LIMITATIONS


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


def _cross(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
) -> tuple[float, float, float]:
    return (
        left[1] * right[2] - left[2] * right[1],
        left[2] * right[0] - left[0] * right[2],
        left[0] * right[1] - left[1] * right[0],
    )


def _norm(vector: tuple[float, float, float]) -> float:
    return sqrt(sum(component * component for component in vector))


def _cell_heights(
    cell: list[tuple[float, float, float]],
) -> tuple[float, float, float]:
    volume = abs(_determinant(cell))
    face_areas = (
        _norm(_cross(cell[1], cell[2])),
        _norm(_cross(cell[0], cell[2])),
        _norm(_cross(cell[0], cell[1])),
    )
    if volume < 1e-10 or any(area < 1e-10 for area in face_areas):
        raise ValueError("Cell matrix is singular.")
    return tuple(volume / area for area in face_areas)


def _periodic_distance_for_shift(
    fractional: tuple[float, float, float],
    shift: tuple[int, int, int],
    cell: list[tuple[float, float, float]],
) -> float:
    wrapped = tuple(fractional[index] - shift[index] for index in range(3))
    cartesian = (
        wrapped[0] * cell[0][0] + wrapped[1] * cell[1][0] + wrapped[2] * cell[2][0],
        wrapped[0] * cell[0][1] + wrapped[1] * cell[1][1] + wrapped[2] * cell[2][1],
        wrapped[0] * cell[0][2] + wrapped[1] * cell[1][2] + wrapped[2] * cell[2][2],
    )
    return _norm(cartesian)


def _minimum_periodic_distance(
    left: tuple[float, float, float],
    right: tuple[float, float, float],
    cell: list[tuple[float, float, float]],
    inverse_cell_transpose: list[list[float]],
    *,
    include_same_cell: bool,
) -> tuple[float, tuple[int, int, int]]:
    """Return the exact nearest periodic distance for a three-dimensional cell.

    The initial local search supplies an upper bound. Cell-face heights then
    bound every lattice translation that could improve that distance, including
    highly skewed cells. For atoms from the same molecular body, the zero shift
    is excluded so covalent contacts are ignored while contacts with periodic
    replicas remain visible.
    """
    displacement = (
        left[0] - right[0],
        left[1] - right[1],
        left[2] - right[2],
    )
    fractional = _matrix_vector(inverse_cell_transpose, displacement)
    nearest = tuple(round(value) for value in fractional)
    minimum_distance = float("inf")
    minimum_shift: tuple[int, int, int] | None = None

    for a_shift in (-1, 0, 1):
        for b_shift in (-1, 0, 1):
            for c_shift in (-1, 0, 1):
                shift = (
                    nearest[0] + a_shift,
                    nearest[1] + b_shift,
                    nearest[2] + c_shift,
                )
                if not include_same_cell and shift == (0, 0, 0):
                    continue
                distance = _periodic_distance_for_shift(fractional, shift, cell)
                if distance < minimum_distance:
                    minimum_distance = distance
                    minimum_shift = shift

    if minimum_shift is None or not isfinite(minimum_distance):
        raise ValueError("No valid periodic image was available for contact analysis.")

    # Improve the initial upper bound before constructing the exhaustive search
    # box. This matters for non-reduced cells where a short lattice vector can
    # require coefficients outside the first [-1, 1] neighborhood.
    for _ in range(100):
        improved = False
        current_shift = minimum_shift
        for a_offset in (-1, 0, 1):
            for b_offset in (-1, 0, 1):
                for c_offset in (-1, 0, 1):
                    shift = (
                        current_shift[0] + a_offset,
                        current_shift[1] + b_offset,
                        current_shift[2] + c_offset,
                    )
                    if not include_same_cell and shift == (0, 0, 0):
                        continue
                    distance = _periodic_distance_for_shift(fractional, shift, cell)
                    if distance + 1e-12 < minimum_distance:
                        minimum_distance = distance
                        minimum_shift = shift
                        improved = True
        if not improved:
            break

    heights = _cell_heights(cell)
    ranges: list[range] = []
    for component, height in zip(fractional, heights):
        span = minimum_distance / height
        ranges.append(
            range(
                floor(component - span) - 1,
                ceil(component + span) + 2,
            )
        )

    translation_count = len(ranges[0]) * len(ranges[1]) * len(ranges[2])
    if translation_count > 250_000:
        raise ValueError(
            "Cell is too skewed for bounded periodic contact analysis "
            f"({translation_count} lattice translations required)."
        )

    for a_shift in ranges[0]:
        for b_shift in ranges[1]:
            for c_shift in ranges[2]:
                shift = (a_shift, b_shift, c_shift)
                if not include_same_cell and shift == (0, 0, 0):
                    continue
                distance = _periodic_distance_for_shift(fractional, shift, cell)
                if distance < minimum_distance:
                    minimum_distance = distance
                    minimum_shift = shift

    return minimum_distance, minimum_shift


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


def _candidate_with_geometry(
    candidate: CandidateStructure,
    positions: list[tuple[float, float, float]],
    cell: list[tuple[float, float, float]],
) -> CandidateStructure:
    if len(positions) != len(candidate.atoms):
        raise ValueError(
            "Optimized position count does not match the generated candidate atom count."
        )
    return CandidateStructure(
        z_value=candidate.z_value,
        source_index=candidate.source_index,
        comment=candidate.comment,
        atoms=[
            AtomRecord(atom.symbol, position, atom.molecule_index)
            for atom, position in zip(candidate.atoms, positions)
        ],
        cell=cell,
        raw_text=candidate.raw_text,
    )


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
    minimum_heavy_atom_ratio: float | None = None
    minimum_contact: dict[str, Any] | None = None
    intermolecular_pairs = 0
    periodic_self_image_pairs = 0
    clash_count = 0
    periodic_self_image_clash_count = 0
    close_contact_count = 0
    threshold = float(options.get("clashThresholdRatio", 0.65))

    if inverse_cell_transpose is not None:
        try:
            for left_index, left in enumerate(candidate.atoms):
                for right_index in range(left_index, len(candidate.atoms)):
                    right = candidate.atoms[right_index]
                    same_molecular_body = left.molecule_index == right.molecule_index
                    distance, image_shift = _minimum_periodic_distance(
                        left.position,
                        right.position,
                        candidate.cell,
                        inverse_cell_transpose,
                        include_same_cell=not same_molecular_body,
                    )
                    radius_sum = VDW_RADII.get(left.symbol, 1.8) + VDW_RADII.get(right.symbol, 1.8)
                    ratio = distance / radius_sum
                    intermolecular_pairs += 1
                    if same_molecular_body:
                        periodic_self_image_pairs += 1
                    if minimum_ratio is None or ratio < minimum_ratio:
                        minimum_distance = distance
                        minimum_ratio = ratio
                        minimum_contact = {
                            "leftAtomIndex": left_index,
                            "rightAtomIndex": right_index,
                            "leftElement": left.symbol,
                            "rightElement": right.symbol,
                            "leftMoleculeIndex": left.molecule_index,
                            "rightMoleculeIndex": right.molecule_index,
                            "imageShift": list(image_shift),
                            "distanceAngstrom": distance,
                            "vdwRatio": ratio,
                            "periodicSelfImage": same_molecular_body,
                        }
                    if left.symbol != "H" and right.symbol != "H":
                        minimum_heavy_atom_ratio = (
                            ratio
                            if minimum_heavy_atom_ratio is None
                            else min(minimum_heavy_atom_ratio, ratio)
                        )
                    if ratio < threshold:
                        clash_count += 1
                        if same_molecular_body:
                            periodic_self_image_clash_count += 1
                    if ratio < 0.8:
                        close_contact_count += 1
        except ValueError as error:
            reasons.append(f"Periodic contact analysis failed: {error}")

    clash_rate = clash_count / intermolecular_pairs if intermolecular_pairs else 0.0
    if clash_count > int(options.get("maxClashCount", 0)):
        reasons.append(
            f"Found {clash_count} periodic intermolecular clashes below "
            f"{threshold:.3f} times the van der Waals radii sum."
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
        "minimumHeavyAtomVdwRatio": minimum_heavy_atom_ratio,
        "minimumContact": minimum_contact,
        "intermolecularPairCount": intermolecular_pairs,
        "periodicSelfImagePairCount": periodic_self_image_pairs,
        "clashCount": clash_count,
        "periodicSelfImageClashCount": periodic_self_image_clash_count,
        "closeContactCount": close_contact_count,
        "clashRate": clash_rate,
        "clashThresholdRatio": threshold,
        "vdwRadiusSet": "molflow-v1",
    }


def _artifact_info(path: Path) -> dict[str, Any]:
    return {"name": path.name, "sizeBytes": path.stat().st_size}


def process_generated_outputs(
    generated_dir: Path,
    artifacts_dir: Path,
    input_atom_count: int,
    z_values: list[int],
    options: dict[str, Any],
    generation_seed: int | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    ensure_dir(artifacts_dir)
    candidates: list[dict[str, Any]] = []
    candidate_objects: dict[str, CandidateStructure] = {}
    missing_sources: list[str] = []
    geometry_enabled = bool(options.get("geometryEnabled", True))

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
                "geometryEnabled": geometry_enabled,
            }
            try:
                candidate = parse_candidate(block, z_value, source_index)
                candidate_objects[candidate_id] = candidate
                if geometry_enabled:
                    pre_geometry = analyze_geometry(candidate, input_atom_count, options)
                    entry["preOptimizationGeometry"] = pre_geometry
                    entry["geometryStage"] = "pre-optimization"
                    entry.update(pre_geometry)
                else:
                    entry.update(
                        {
                            "geometryPassed": True,
                            "geometryStage": "not-enforced",
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
    potential_task = UMA_TASK_NAME if uma_ranking_enabled else None
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
    optimized_rejected_structures: list[str] = []

    for entry in candidates:
        if not entry.get("geometryPassed"):
            entry["status"] = "pre_geometry_rejected"
            continue

        if not scoring_enabled:
            entry["status"] = "accepted"
            entry["accepted"] = True
            entry["scientificStatus"] = "geometry-screened candidate"
            continue

        candidate = candidate_objects[entry["id"]]
        entry.update(
            {
                "potentialProvider": POTENTIAL_PROVIDER if POTENTIAL_PROVIDER != "none" else None,
                "potentialModel": potential_model if POTENTIAL_PROVIDER != "none" else None,
                "potentialTask": potential_task,
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
                    "energyType": "UMA total potential energy per molecule" if uma_ranking_enabled else "potential energy per molecule",
                    "initialEnergyEv": result.initial_energy_ev,
                    "initialEnergyEvPerMolecule": (
                        result.initial_energy_ev / candidate.z_value
                        if result.initial_energy_ev is not None
                        else None
                    ),
                    "initialMaxForceEvPerAngstrom": result.initial_max_force_ev_per_angstrom,
                    "maxForceEvPerAngstrom": result.max_force_ev_per_angstrom,
                    "forceKind": result.force_kind,
                    "optimized": result.optimized,
                    "optimizationType": result.optimization_type,
                    "optimizationSteps": result.optimization_steps,
                    "optimizationProtocol": result.optimization_protocol,
                    "optimizationConverged": result.optimization_converged,
                    "potentialProvider": result.potential_provider,
                    "potentialModel": result.potential_model,
                    "potentialTask": result.potential_task,
                    "potentialPackageVersion": result.potential_package_version,
                    "aseVersion": result.ase_version,
                }
            )
            relaxed_structures[entry["id"]] = (result.positions, result.cell)

            if result.optimized:
                optimized_candidate = _candidate_with_geometry(
                    candidate,
                    result.positions,
                    result.cell,
                )
                post_geometry = analyze_geometry(
                    optimized_candidate,
                    input_atom_count,
                    options,
                )
                entry["postOptimizationGeometry"] = post_geometry
                if geometry_enabled:
                    entry["geometryStage"] = "post-optimization"
                    entry.update(post_geometry)
                    if not post_geometry["geometryPassed"]:
                        entry["status"] = "post_geometry_rejected"
                        entry["accepted"] = False
                        optimized_rejected_structures.append(
                            _serialize_candidate(
                                candidate,
                                positions=result.positions,
                                cell=result.cell,
                                metadata={
                                    "id": entry["id"],
                                    "status": entry["status"],
                                    "minimum_vdw_ratio": post_geometry.get("minimumVdwRatio"),
                                    "clash_count": post_geometry.get("clashCount"),
                                    "potential_provider": result.potential_provider,
                                    "potential_model": result.potential_model,
                                    "potential_task": result.potential_task,
                                    "optimization_steps": result.optimization_steps,
                                },
                            )
                        )
                        continue
                else:
                    entry["geometryEvaluationPassed"] = post_geometry["geometryPassed"]
                    entry["minimumIntermolecularDistanceAngstrom"] = post_geometry.get(
                        "minimumIntermolecularDistanceAngstrom"
                    )
                    entry["minimumVdwRatio"] = post_geometry.get("minimumVdwRatio")
                    entry["minimumHeavyAtomVdwRatio"] = post_geometry.get(
                        "minimumHeavyAtomVdwRatio"
                    )
                    entry["minimumContact"] = post_geometry.get("minimumContact")
                    entry["clashCount"] = post_geometry.get("clashCount")
                    entry["periodicSelfImageClashCount"] = post_geometry.get(
                        "periodicSelfImageClashCount"
                    )
                    entry["densityGcm3"] = post_geometry.get("densityGcm3")

            if uma_ranking_enabled:
                entry["status"] = "scored"
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
            entry["status"] = "potential_failed"
            entry["reasons"].append(f"Potential evaluation failed: {error}")

    if evaluator is not None:
        close_evaluator = getattr(evaluator, "close", None)
        if callable(close_evaluator):
            close_evaluator()

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
                entry["status"] = "accepted"
                entry["accepted"] = True
                entry["scientificStatus"] = (
                    "UMA-ranked candidate with final geometry screening"
                    if geometry_enabled
                    else "UMA-ranked candidate without enforced geometry screening"
                )
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
                    entry["scientificStatus"] = "potential-ranked candidate"

    accepted_by_z: dict[int, list[str]] = {}
    accepted_combined: list[str] = []
    accepted_individuals: list[tuple[str, str]] = []

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
                "energy_type": entry.get("energyType"),
                "energy_ev_per_molecule": entry.get("energyEvPerMolecule"),
                "relative_energy_ev_per_molecule": entry.get("relativeEnergyEvPerMolecule"),
                "minimum_vdw_ratio": entry.get("minimumVdwRatio"),
                "minimum_heavy_atom_vdw_ratio": entry.get("minimumHeavyAtomVdwRatio"),
                "clash_count": entry.get("clashCount"),
                "periodic_self_image_clash_count": entry.get("periodicSelfImageClashCount"),
                "pre_optimization_minimum_vdw_ratio": (
                    entry.get("preOptimizationGeometry") or {}
                ).get("minimumVdwRatio"),
                "post_optimization_minimum_vdw_ratio": (
                    entry.get("postOptimizationGeometry") or {}
                ).get("minimumVdwRatio"),
                "initial_energy_ev_per_molecule": entry.get("initialEnergyEvPerMolecule"),
                "initial_max_force_ev_per_angstrom": entry.get("initialMaxForceEvPerAngstrom"),
                "max_force_ev_per_angstrom": entry.get("maxForceEvPerAngstrom"),
                "force_kind": entry.get("forceKind"),
                "optimized": entry.get("optimized"),
                "optimization_type": entry.get("optimizationType"),
                "optimization_steps": entry.get("optimizationSteps"),
                "optimization_protocol": entry.get("optimizationProtocol"),
                "optimization_converged": entry.get("optimizationConverged"),
                "potential_provider": entry.get("potentialProvider"),
                "potential_model": entry.get("potentialModel"),
                "potential_task": entry.get("potentialTask"),
                "potential_package_version": entry.get("potentialPackageVersion"),
                "ase_version": entry.get("aseVersion"),
                "scientific_status": entry.get("scientificStatus"),
            },
        )
        bucket = accepted_by_z.setdefault(candidate.z_value, [])
        entry["acceptedIndex"] = len(bucket)
        bucket.append(structure_text)
        accepted_combined.append(structure_text)
        rank = entry.get("rank")
        rank_label = (
            f"rank_{int(rank):04d}"
            if isinstance(rank, (int, float))
            else f"accepted_{entry['acceptedIndex'] + 1:04d}"
        )
        source_label = f"source_{int(entry['sourceIndex']) + 1:04d}"
        individual_name = (
            f"accepted/z{candidate.z_value}/"
            f"{rank_label}_z{candidate.z_value}_{source_label}.xyz"
        )
        entry["individualArtifact"] = individual_name
        accepted_individuals.append((individual_name, structure_text))

    artifact_paths: list[Path] = []
    for z_value, structures in accepted_by_z.items():
        output_path = artifacts_dir / f"crystals_z{z_value}.xyz"
        output_path.write_text("".join(structures))
        artifact_paths.append(output_path)

    if accepted_combined:
        combined_path = artifacts_dir / "pred_combined.xyz"
        combined_path.write_text("".join(accepted_combined))
        artifact_paths.append(combined_path)

    if optimized_rejected_structures:
        rejected_path = artifacts_dir / "raw_optimized_postcheck_rejected.xyz"
        rejected_path.write_text("".join(optimized_rejected_structures))
        artifact_paths.append(rejected_path)

    pre_geometry_rejected_count = sum(
        entry.get("status") == "pre_geometry_rejected" for entry in candidates
    )
    post_geometry_rejected_count = sum(
        entry.get("status") == "post_geometry_rejected" for entry in candidates
    )
    pre_geometry_passed_count = sum(
        bool((entry.get("preOptimizationGeometry") or {}).get("geometryPassed"))
        for entry in candidates
    )
    post_geometry_evaluated_count = sum(
        entry.get("postOptimizationGeometry") is not None for entry in candidates
    )
    post_geometry_passed_count = sum(
        bool((entry.get("postOptimizationGeometry") or {}).get("geometryPassed"))
        for entry in candidates
    )

    summary = {
        "generatedCount": len(candidates),
        "geometryPassedCount": sum(bool(entry.get("geometryPassed")) for entry in candidates),
        "geometryRejectedCount": pre_geometry_rejected_count + post_geometry_rejected_count,
        "preOptimizationGeometryPassedCount": pre_geometry_passed_count,
        "preOptimizationGeometryRejectedCount": pre_geometry_rejected_count,
        "postOptimizationGeometryEvaluatedCount": post_geometry_evaluated_count,
        "postOptimizationGeometryPassedCount": post_geometry_passed_count,
        "postOptimizationGeometryRejectedCount": post_geometry_rejected_count,
        "clashRejectedCount": sum(
            (
                entry.get("status") == "pre_geometry_rejected"
                and int((entry.get("preOptimizationGeometry") or {}).get("clashCount", 0)) > 0
            )
            or (
                entry.get("status") == "post_geometry_rejected"
                and int((entry.get("postOptimizationGeometry") or {}).get("clashCount", 0)) > 0
            )
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
        "potentialTask": potential_task,
        "potentialPackageVersion": next(
            (
                entry.get("potentialPackageVersion")
                for entry in candidates
                if entry.get("potentialPackageVersion")
            ),
            None,
        ),
        "aseVersion": next(
            (entry.get("aseVersion") for entry in candidates if entry.get("aseVersion")),
            None,
        ),
        "rigidBodySteps": RIGID_BODY_STEPS if uma_ranking_enabled else None,
        "acceptedCount": sum(bool(entry.get("accepted")) for entry in candidates),
        "scientificScope": "generated, geometry-screened, and potential-ranked candidates; not validated stable crystals",
        "generatorBackend": GENERATOR_BACKEND,
        "generatorModel": V2_MODEL_NAME if GENERATOR_BACKEND == "ccdc_v2" else "omc25-legacy",
        "generatorFeatureMode": V2_FEATURE_MODE if GENERATOR_BACKEND == "ccdc_v2" else "legacy",
        "generatorInputComplete": (
            V2_FEATURE_MODE != "neutral"
            if GENERATOR_BACKEND == "ccdc_v2"
            else True
        ),
        "generatorInputExact": (
            V2_FEATURE_MODE == "factory" and V2_REQUIRE_EXACT_FEATURES
            if GENERATOR_BACKEND == "ccdc_v2"
            else True
        ),
        "generatorInputLimitations": (
            list(V2_INFERENCE_KIT_LIMITATIONS)
            if GENERATOR_BACKEND == "ccdc_v2" and V2_FEATURE_MODE == "inference_kit"
            else (
                ["Nine required CCDC-v2 molecular descriptors were replaced with zeros."]
                if GENERATOR_BACKEND == "ccdc_v2" and V2_FEATURE_MODE == "neutral"
                else []
            )
        ),
        "generationSeed": generation_seed,
        "settings": options,
    }

    manifest_path = artifacts_dir / "candidates.json"
    write_json(
        manifest_path,
        {
            "schemaVersion": 2,
            "provenance": {
                "generatorBackend": summary["generatorBackend"],
                "generatorModel": summary["generatorModel"],
                "generatorFeatureMode": summary["generatorFeatureMode"],
                "generatorInputComplete": summary["generatorInputComplete"],
                "generatorInputExact": summary["generatorInputExact"],
                "generatorInputLimitations": summary["generatorInputLimitations"],
                "generationSeed": summary["generationSeed"],
                "potentialProvider": summary["potentialProvider"],
                "potentialModel": summary["potentialModel"],
                "potentialTask": summary["potentialTask"],
                "potentialPackageVersion": summary["potentialPackageVersion"],
                "aseVersion": summary["aseVersion"],
                "rigidBodySteps": summary["rigidBodySteps"],
            },
            "summary": summary,
            "candidates": candidates,
        },
    )
    artifact_paths.append(manifest_path)

    if accepted_individuals:
        archive_path = artifacts_dir / "individual_candidates.zip"
        with ZipFile(archive_path, "w", compression=ZIP_DEFLATED) as archive:
            archive.writestr(
                "README.txt",
                "MolCrystalFlow accepted candidates\n"
                "Each XYZ file contains one accepted candidate exactly as exported in "
                "the ranked per-Z and combined files. candidates.json contains filtering, "
                "optimization, energy, and provenance metadata.\n",
            )
            archive.write(manifest_path, arcname="candidates.json")
            for individual_name, structure_text in accepted_individuals:
                archive.writestr(individual_name, structure_text)
        artifact_paths.append(archive_path)

    for raw_path in sorted(artifacts_dir.glob("raw_*.xyz")):
        artifact_paths.append(raw_path)

    unique_paths = list(dict.fromkeys(artifact_paths))
    return [_artifact_info(path) for path in unique_paths], summary
