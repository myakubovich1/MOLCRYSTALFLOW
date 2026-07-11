from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import numpy as np
from ase.optimize import BFGS

from .config import CSP_DIR


def _add_csp_uma_paths() -> None:
    paths = [
        CSP_DIR / "uma-s1p1-omc-opt",
        CSP_DIR / "uma-s1p1-omc-opt" / "utils",
    ]
    for path in paths:
        resolved = str(Path(path).expanduser().resolve())
        if resolved not in sys.path:
            sys.path.insert(0, resolved)


def _load_rigid_constraint_function() -> Any:
    _add_csp_uma_paths()
    from utils.rigid_constraint import add_rigid_body_constraints

    return add_rigid_body_constraints


def optimize_rigid_body(
    atoms: Any,
    calculator: Any,
    steps: int = 10,
    molecule_indices: Any | None = None,
    bb_indices: Any | None = None,
    **_: Any,
) -> Any:
    """Run the lab csp-pipeline rigid-body relaxation pattern for one ASE Atoms object.

    The csp-pipeline implementation is batch-script oriented. This adapter keeps
    the same rigid-body constraint helper and ASE BFGS optimizer pattern, but
    exposes it as the callable backend hook expected by MolFlow.
    """
    if steps != 10:
        raise ValueError("UMA rigid-body optimization must use exactly 10 steps.")

    add_rigid_body_constraints = _load_rigid_constraint_function()
    optimized_atoms = atoms.copy()
    optimized_atoms.calc = calculator

    body_indices = bb_indices if bb_indices is not None else molecule_indices
    if body_indices is None:
        body_indices = optimized_atoms.arrays.get("bb_indices")
    if body_indices is None:
        body_indices = optimized_atoms.arrays.get("bb_idx")
    if body_indices is None:
        raise ValueError("Rigid-body optimization requires molecule_indices or bb_indices.")

    body_indices_array = np.asarray(body_indices, dtype=int)
    if len(body_indices_array) != len(optimized_atoms):
        raise ValueError(
            "Rigid-body molecule index count does not match the number of atoms."
        )

    optimized_atoms.set_array("bb_indices", body_indices_array)
    optimized_atoms.set_array("bb_idx", body_indices_array)

    constraints = add_rigid_body_constraints(optimized_atoms)
    if constraints is not None:
        if not isinstance(constraints, (list, tuple)):
            constraints = [constraints]
        optimized_atoms.set_constraint(list(constraints))

    optimizer = BFGS(optimized_atoms, logfile=None)
    optimizer.run(fmax=0.0, steps=steps)
    optimized_atoms.calc = calculator
    return optimized_atoms
