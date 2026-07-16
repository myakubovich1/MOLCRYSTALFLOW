"""Auxiliary molecular descriptors for the CCDC-v2 epoch-436 checkpoint.

The implementation is adapted from the lab-supplied CSP inference kit. The
checkpoint consumes these values directly; there is no separate scaler for
the two basic and seven geometric descriptors.
"""

from typing import Any


BASIC_FEATURE_NAMES = (
    "num_heavy_atoms",
    "molecular_weight",
)
GEOMETRIC_FEATURE_NAMES = (
    "radius_of_gyration",
    "asphericity",
    "eccentricity",
    "planarity",
    "principal_component_1_length",
    "principal_component_2_length",
    "principal_component_3_length",
)
FEATURE_PROVENANCE = "lab-csp-inference-kit-7geo-2basic-planarity-i2-over-i1"
FEATURE_LIMITATIONS = (
    "The planarity descriptor uses the inference kit's I2/I1 approximation; "
    "the kit reports an approximately 0.01 difference from its available CSD reference.",
)


def _validate_inputs(positions: Any, symbols: Any) -> tuple[Any, tuple[str, ...], Any]:
    import numpy as np
    from ase.data import atomic_masses, atomic_numbers

    position_array = np.asarray(positions, dtype=np.float64)
    symbol_tuple = tuple(str(symbol) for symbol in symbols)

    if position_array.ndim != 2 or position_array.shape[1:] != (3,):
        raise ValueError("positions must have shape (N, 3).")
    if position_array.shape[0] == 0:
        raise ValueError("At least one atom is required to compute molecular descriptors.")
    if position_array.shape[0] != len(symbol_tuple):
        raise ValueError("positions and symbols must contain the same number of atoms.")
    if not np.all(np.isfinite(position_array)):
        raise ValueError("positions contains non-finite coordinates.")

    unknown_symbols = sorted({symbol for symbol in symbol_tuple if symbol not in atomic_numbers})
    if unknown_symbols:
        raise ValueError("Unsupported element symbols: " + ", ".join(unknown_symbols))

    masses = np.asarray(
        [atomic_masses[atomic_numbers[symbol]] for symbol in symbol_tuple],
        dtype=np.float64,
    )
    if not np.all(np.isfinite(masses)) or float(masses.sum()) <= 0:
        raise ValueError("Atomic masses are unavailable for one or more input elements.")
    return position_array, symbol_tuple, masses


def compute_auxiliary_features(positions: Any, symbols: Any) -> dict[str, float]:
    """Compute the two basic and seven geometric descriptors for one monomer."""
    import numpy as np

    position_array, symbol_tuple, masses = _validate_inputs(positions, symbols)

    weights = masses / masses.sum()
    mass_centroid = (position_array * weights[:, None]).sum(axis=0)
    mass_centered = position_array - mass_centroid
    mass_covariance = (mass_centered * weights[:, None]).T @ mass_centered
    mass_eigenvalues = np.linalg.eigvalsh(mass_covariance)[::-1]
    first, second, third = mass_eigenvalues

    radius_of_gyration = float(np.sqrt(max(0.0, first + second + third)))
    asphericity = float(first - 0.5 * (second + third))
    eccentricity = float(np.sqrt(max(0.0, 1.0 - third / first))) if first > 0 else 0.0
    planarity = float(second / first) if first > 0 else 0.0

    centroid = position_array.mean(axis=0)
    centered = position_array - centroid
    covariance = centered.T @ centered / len(centered)
    _, principal_axes = np.linalg.eigh(covariance)
    principal_axes = principal_axes[:, ::-1]
    projections = centered @ principal_axes
    principal_lengths = projections.max(axis=0) - projections.min(axis=0)

    descriptors = {
        "num_heavy_atoms": float(sum(symbol != "H" for symbol in symbol_tuple)),
        "molecular_weight": float(masses.sum()),
        "radius_of_gyration": radius_of_gyration,
        "asphericity": asphericity,
        "eccentricity": eccentricity,
        "planarity": planarity,
        "principal_component_1_length": float(principal_lengths[0]),
        "principal_component_2_length": float(principal_lengths[1]),
        "principal_component_3_length": float(principal_lengths[2]),
    }
    if not all(np.isfinite(value) for value in descriptors.values()):
        raise ValueError("Computed auxiliary descriptors contain non-finite values.")
    return descriptors


def split_basic_geometric(descriptors: dict[str, float]) -> tuple[Any, Any]:
    """Return model inputs in the lab-supplied checkpoint column order."""
    import numpy as np

    basic = np.asarray(
        [descriptors[name] for name in BASIC_FEATURE_NAMES],
        dtype=np.float32,
    )
    geometric = np.asarray(
        [descriptors[name] for name in GEOMETRIC_FEATURE_NAMES],
        dtype=np.float32,
    )
    return basic, geometric


def build_inference_kit_features(
    *,
    symbols: Any,
    coordinates: Any,
    **_: Any,
) -> dict[str, Any]:
    """Build the feature-factory payload from a raw monomer conformer."""
    descriptors = compute_auxiliary_features(coordinates, symbols)
    basic, geometric = split_basic_geometric(descriptors)
    return {
        "geometric_features": geometric,
        "basic_features": basic,
        "chemical_features": None,
        "provenance": FEATURE_PROVENANCE,
        "complete": True,
        "exact": False,
        "limitations": FEATURE_LIMITATIONS,
    }
