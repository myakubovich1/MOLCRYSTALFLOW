from dataclasses import dataclass
from importlib import import_module
from math import isfinite
from pathlib import Path
from typing import Any, Callable


EXPECTED_NODE_EXTRA_DIM = 13
KNOWN_NODE_EXTRA_DIM = 4  # bb_num_vec (1) + PCA eigenvalues (3)
NEUTRAL_GEOMETRIC_DIM = 4
NEUTRAL_BASIC_DIM = 5


class V2InputError(ValueError):
    pass


class V2FeatureError(RuntimeError):
    pass


@dataclass(frozen=True)
class ParsedMolecule:
    symbols: tuple[str, ...]
    atomic_numbers: Any
    coordinates: Any
    centered_coordinates: Any
    local_coordinates: Any
    canonical_rotation: Any
    eigenvalues: Any
    axis_flips: Any
    formula: str

    @property
    def atom_count(self) -> int:
        return len(self.symbols)


@dataclass(frozen=True)
class AuxiliaryFeatures:
    geometric: Any
    basic: Any
    chemical: Any | None
    provenance: str
    exact: bool

    @property
    def supplied_dim(self) -> int:
        chemical_dim = 0 if self.chemical is None else int(self.chemical.shape[0])
        return int(self.geometric.shape[0]) + int(self.basic.shape[0]) + chemical_dim


def _build_formula(symbols: tuple[str, ...]) -> str:
    counts: dict[str, int] = {}
    for symbol in symbols:
        counts[symbol] = counts.get(symbol, 0) + 1

    ordered: list[str] = []
    if "C" in counts:
        ordered.append("C")
        if "H" in counts:
            ordered.append("H")
        ordered.extend(sorted(symbol for symbol in counts if symbol not in {"C", "H"}))
    else:
        ordered.extend(sorted(counts))
    return "".join(
        f"{symbol}{counts[symbol] if counts[symbol] > 1 else ''}"
        for symbol in ordered
    )


def _parse_xyz_rows(path: Path) -> tuple[tuple[str, ...], list[list[float]]]:
    if not path.is_file():
        raise V2InputError(f"Input XYZ file does not exist: {path}")

    lines = path.read_text(errors="strict").splitlines()
    if len(lines) < 3:
        raise V2InputError("XYZ input must contain an atom count, comment line, and atoms.")

    try:
        declared_count = int(lines[0].strip())
    except ValueError as error:
        raise V2InputError("The first XYZ line must be an integer atom count.") from error

    if declared_count <= 0:
        raise V2InputError("XYZ atom count must be positive.")

    atom_lines = [line for line in lines[2:] if line.strip()]
    if len(atom_lines) != declared_count:
        raise V2InputError(
            f"XYZ declares {declared_count} atoms but contains {len(atom_lines)} atom rows."
        )

    symbols: list[str] = []
    coordinates: list[list[float]] = []
    for row_number, line in enumerate(atom_lines, start=3):
        fields = line.split()
        if len(fields) < 4:
            raise V2InputError(f"XYZ atom row {row_number} has fewer than four fields.")
        raw_symbol = fields[0]
        symbol = raw_symbol[:1].upper() + raw_symbol[1:].lower()
        if not symbol.isalpha() or len(symbol) > 2:
            raise V2InputError(f"XYZ atom row {row_number} has invalid element {raw_symbol!r}.")
        try:
            position = [float(fields[1]), float(fields[2]), float(fields[3])]
        except ValueError as error:
            raise V2InputError(
                f"XYZ atom row {row_number} contains a non-numeric coordinate."
            ) from error
        if not all(isfinite(value) for value in position):
            raise V2InputError(f"XYZ atom row {row_number} contains a non-finite coordinate.")
        symbols.append(symbol)
        coordinates.append(position)

    return tuple(symbols), coordinates


def prepare_molecule(path: Path) -> ParsedMolecule:
    import numpy as np
    from ase.data import atomic_numbers

    symbols, coordinate_rows = _parse_xyz_rows(path)
    unknown_symbols = [symbol for symbol in symbols if symbol not in atomic_numbers]
    if unknown_symbols:
        raise V2InputError(
            "Unsupported element symbols: " + ", ".join(sorted(set(unknown_symbols)))
        )

    atomic_number_array = np.asarray(
        [atomic_numbers[symbol] for symbol in symbols],
        dtype=np.int64,
    )
    if np.any(atomic_number_array < 1) or np.any(atomic_number_array > 118):
        raise V2InputError("The v2 model supports atomic numbers from 1 through 118.")

    coordinates = np.asarray(coordinate_rows, dtype=np.float64)
    centered = coordinates - coordinates.mean(axis=0, keepdims=True)

    if len(symbols) == 1:
        rotation = np.eye(3, dtype=np.float64)
        eigenvalues = np.zeros(3, dtype=np.float64)
        axis_flips = np.zeros(3, dtype=np.float64)
    else:
        covariance = np.cov(centered, rowvar=False)
        if covariance.ndim == 0 or not np.all(np.isfinite(covariance)):
            raise V2InputError("The molecular coordinates do not define a valid PCA frame.")

        eigenvalues, axes = np.linalg.eigh(covariance)
        order = np.argsort(eigenvalues)[::-1]
        eigenvalues = eigenvalues[order]
        axes = axes[:, order]

        weights = atomic_number_array / atomic_number_array.sum()
        equivariant_vector = np.sum(centered * weights[:, None], axis=0)
        if np.allclose(equivariant_vector, 0):
            for atom_index in np.argsort(np.linalg.norm(centered, axis=1)):
                candidate = centered[atom_index]
                if not np.allclose(candidate, 0):
                    equivariant_vector = candidate
                    break
        if np.allclose(equivariant_vector, 0):
            raise V2InputError(
                "All molecular coordinates are coincident; a canonical orientation cannot be built."
            )

        initial_flips = (equivariant_vector @ axes < 0).astype(int)
        axes = np.where(initial_flips[None, :], -axes, axes)
        cross_axis = np.cross(axes[:, 0], axes[:, 1])
        rotation = np.stack([axes[:, 0], axes[:, 1], cross_axis], axis=1)
        axis_flips = np.asarray(
            [0, 0, 0] if cross_axis @ equivariant_vector > 0 else [1, 0, 0],
            dtype=np.float64,
        )

    local_coordinates = centered @ rotation
    if not np.allclose(rotation.T @ rotation, np.eye(3), atol=1e-5):
        raise V2InputError("Canonical molecular rotation is not orthonormal.")
    if np.linalg.det(rotation) < 0.999:
        raise V2InputError("Canonical molecular rotation is not right-handed.")

    return ParsedMolecule(
        symbols=symbols,
        atomic_numbers=atomic_number_array,
        coordinates=coordinates,
        centered_coordinates=centered,
        local_coordinates=local_coordinates,
        canonical_rotation=rotation,
        eigenvalues=np.asarray(eigenvalues, dtype=np.float64),
        axis_flips=axis_flips,
        formula=_build_formula(symbols),
    )


def _as_feature_vector(value: Any, label: str) -> Any:
    import numpy as np

    vector = np.asarray(value, dtype=np.float32)
    if vector.ndim != 1:
        raise V2FeatureError(f"{label} must be a one-dimensional feature vector.")
    if not np.all(np.isfinite(vector)):
        raise V2FeatureError(f"{label} contains non-finite values.")
    return vector


def _load_factory(factory_path: str) -> Callable[..., Any]:
    if ":" not in factory_path:
        raise V2FeatureError(
            "Feature factory must use the form 'python.module:factory_function'."
        )
    module_name, function_name = factory_path.split(":", 1)
    try:
        module = import_module(module_name)
        factory = getattr(module, function_name)
    except (ImportError, AttributeError) as error:
        raise V2FeatureError(
            f"Could not import v2 feature factory {factory_path!r}: {error}"
        ) from error
    if not callable(factory):
        raise V2FeatureError(f"Configured feature factory {factory_path!r} is not callable.")
    return factory


def build_auxiliary_features(
    molecule: ParsedMolecule,
    *,
    mode: str,
    factory_path: str = "",
) -> AuxiliaryFeatures:
    import numpy as np

    if mode == "neutral":
        features = AuxiliaryFeatures(
            geometric=np.zeros(NEUTRAL_GEOMETRIC_DIM, dtype=np.float32),
            basic=np.zeros(NEUTRAL_BASIC_DIM, dtype=np.float32),
            chemical=None,
            provenance="neutral-zero-fallback",
            exact=False,
        )
    elif mode == "factory":
        factory = _load_factory(factory_path)
        raw_features = factory(
            symbols=molecule.symbols,
            atomic_numbers=molecule.atomic_numbers.copy(),
            coordinates=molecule.coordinates.copy(),
            centered_coordinates=molecule.centered_coordinates.copy(),
            local_coordinates=molecule.local_coordinates.copy(),
            eigenvalues=molecule.eigenvalues.copy(),
            axis_flips=molecule.axis_flips.copy(),
        )
        if not isinstance(raw_features, dict):
            raise V2FeatureError("Feature factory must return a dictionary.")
        features = AuxiliaryFeatures(
            geometric=_as_feature_vector(
                raw_features.get("geometric_features", []),
                "geometric_features",
            ),
            basic=_as_feature_vector(
                raw_features.get("basic_features", []),
                "basic_features",
            ),
            chemical=(
                None
                if raw_features.get("chemical_features") is None
                else _as_feature_vector(
                    raw_features["chemical_features"],
                    "chemical_features",
                )
            ),
            provenance=str(raw_features.get("provenance", factory_path)),
            exact=bool(raw_features.get("exact", True)),
        )
    else:
        raise V2FeatureError(f"Unsupported v2 feature mode: {mode!r}")

    actual_dim = KNOWN_NODE_EXTRA_DIM + features.supplied_dim
    if actual_dim != EXPECTED_NODE_EXTRA_DIM:
        raise V2FeatureError(
            "The v2 feature pipeline produced "
            f"{actual_dim} node-extra dimensions; checkpoint expects "
            f"{EXPECTED_NODE_EXTRA_DIM}."
        )
    return features


def determinant_3x3(matrix: list[list[float]]) -> float:
    a, b, c = matrix
    return (
        a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])
    )


def serialize_candidate(
    *,
    symbols: tuple[str, ...],
    coordinates: list[list[float]],
    lattice: list[list[float]],
    z_value: int,
    sample_index: int,
    model_name: str,
    feature_provenance: str,
) -> str:
    expected_atoms = len(symbols) * z_value
    if len(coordinates) != expected_atoms:
        raise V2InputError(
            f"Generated candidate contains {len(coordinates)} atoms; expected {expected_atoms}."
        )
    if len(lattice) != 3 or any(len(row) != 3 for row in lattice):
        raise V2InputError("Generated lattice is not a 3x3 matrix.")
    flat_lattice = [value for row in lattice for value in row]
    if not all(isfinite(float(value)) for value in flat_lattice):
        raise V2InputError("Generated lattice contains non-finite values.")
    if abs(determinant_3x3(lattice)) <= 1e-8:
        raise V2InputError("Generated lattice is singular.")
    if any(
        len(position) != 3 or not all(isfinite(float(value)) for value in position)
        for position in coordinates
    ):
        raise V2InputError("Generated coordinates contain invalid values.")

    lattice_text = " ".join(f"{float(value):.10f}" for value in flat_lattice)
    comment = (
        f'CCDC-v2 sample={sample_index} Z={z_value} '
        f'Lattice="{lattice_text}" '
        'Properties=species:S:1:pos:R:3:bb_indices:I:1 '
        f'pbc="T T T" model="{model_name}" features="{feature_provenance}"'
    )
    atom_rows: list[str] = []
    atom_count = len(symbols)
    for molecule_index in range(z_value):
        for atom_index, symbol in enumerate(symbols):
            position = coordinates[molecule_index * atom_count + atom_index]
            atom_rows.append(
                f"{symbol:<2} "
                f"{float(position[0]): .10f} "
                f"{float(position[1]): .10f} "
                f"{float(position[2]): .10f} "
                f"{molecule_index}"
            )
    return "\n".join([str(expected_atoms), comment, *atom_rows]) + "\n"
