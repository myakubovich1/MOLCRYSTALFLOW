from dataclasses import dataclass
from importlib import import_module
from inspect import Parameter, signature
from math import sqrt
from typing import Any

from .config import (
    POTENTIAL_CUSTOM_FACTORY,
    POTENTIAL_DEVICE,
    POTENTIAL_DTYPE,
    POTENTIAL_MODEL,
    POTENTIAL_PROVIDER,
    RIGID_BODY_FACTORY,
    RIGID_BODY_FACTORY_CANDIDATES,
    RIGID_BODY_STEPS,
    UMA_MODEL,
    UMA_TASK_NAME,
    csp_import_paths,
    potential_config_errors,
    rigid_body_config_errors,
    temporary_import_paths,
)


class PotentialConfigurationError(RuntimeError):
    pass


@dataclass
class PotentialResult:
    energy_ev: float
    max_force_ev_per_angstrom: float
    positions: list[tuple[float, float, float]]
    cell: list[tuple[float, float, float]]
    optimized: bool = False
    optimization_type: str | None = None
    optimization_steps: int = 0
    potential_provider: str | None = None
    potential_model: str | None = None
    energy_units: str = "eV"


def _load_uma_calculator() -> Any:
    try:
        from fairchem.core import FAIRChemCalculator, pretrained_mlip
    except ImportError as error:
        raise PotentialConfigurationError(
            "fairchem-core is required for UMA-s-1p2 energy ranking."
        ) from error

    try:
        predictor = pretrained_mlip.get_predict_unit(UMA_MODEL, device=POTENTIAL_DEVICE)
    except Exception as error:
        raise PotentialConfigurationError(
            f"Could not load UMA model {UMA_MODEL!r}: {error}"
        ) from error

    try:
        return FAIRChemCalculator(predictor, task_name=UMA_TASK_NAME)
    except TypeError:
        return FAIRChemCalculator(predictor, task=UMA_TASK_NAME)


def _load_rigid_body_factory() -> Any:
    errors = rigid_body_config_errors()
    if errors:
        raise PotentialConfigurationError(errors[0])

    factory_specs = (
        [RIGID_BODY_FACTORY]
        if RIGID_BODY_FACTORY
        else RIGID_BODY_FACTORY_CANDIDATES
    )
    import_errors: list[str] = []

    for factory_spec in factory_specs:
        if ":" not in factory_spec:
            import_errors.append(
                f"{factory_spec!r} must use the form 'python.module:function'."
            )
            continue

        module_name, function_name = factory_spec.split(":", 1)
        try:
            with temporary_import_paths(csp_import_paths()):
                module = import_module(module_name)
                return getattr(module, function_name)
        except Exception as error:
            import_errors.append(f"{factory_spec}: {error}")

    detail = "; ".join(import_errors[-3:]) if import_errors else "no candidates tested"
    raise PotentialConfigurationError(
        "Could not load a rigid-body optimizer from csp-pipeline. "
        f"Set MOLFLOW_RIGID_BODY_FACTORY explicitly. Last errors: {detail}"
    )


def _looks_like_atoms(value: Any) -> bool:
    return hasattr(value, "get_positions") and hasattr(value, "get_cell")


def _copy_atoms_with(
    atoms: Any,
    positions: Any,
    cell: Any | None = None,
) -> Any:
    updated_atoms = atoms.copy()
    updated_atoms.set_positions(positions)
    if cell is not None:
        updated_atoms.set_cell(cell, scale_atoms=False)
    updated_atoms.calc = atoms.calc
    return updated_atoms


def _copy_atoms(atoms: Any) -> Any:
    copied_atoms = atoms.copy()
    copied_atoms.calc = atoms.calc
    return copied_atoms


def _coerce_optimized_atoms(result: Any, original_atoms: Any) -> Any:
    if result is None:
        return original_atoms

    if _looks_like_atoms(result):
        result.calc = original_atoms.calc
        return result

    if isinstance(result, dict):
        for key in ("atoms", "optimized_atoms", "structure", "optimized_structure"):
            value = result.get(key)
            if _looks_like_atoms(value):
                value.calc = original_atoms.calc
                return value

        positions = result.get("positions")
        if positions is None:
            positions = result.get("optimized_positions")
        if positions is None:
            positions = result.get("cartesian_positions")
        cell = result.get("cell")
        if cell is None:
            cell = result.get("optimized_cell")
        if cell is None:
            cell = result.get("lattice")
        if positions is not None:
            return _copy_atoms_with(original_atoms, positions, cell)

    if isinstance(result, tuple):
        for value in result:
            if _looks_like_atoms(value):
                value.calc = original_atoms.calc
                return value
        if len(result) >= 2:
            if isinstance(result[0], (int, float)) and len(result) >= 3:
                positions, cell = result[1], result[2]
            else:
                positions, cell = result[0], result[1]
            return _copy_atoms_with(original_atoms, positions, cell)

    raise PotentialConfigurationError(
        "Rigid-body optimizer returned an unsupported result. Expected ASE Atoms, "
        "a dict with atoms/positions, or a tuple containing positions and cell."
    )


def _run_rigid_body_optimization(
    atoms: Any,
    calculator: Any,
    molecule_indices: list[int],
    steps: int,
) -> Any:
    if steps != 10:
        raise PotentialConfigurationError("UMA rigid-body optimization must use exactly 10 steps.")

    factory = _load_rigid_body_factory()
    atoms_for_optimizer = _copy_atoms(atoms)
    call_values = {
        "atoms": atoms_for_optimizer,
        "structure": _copy_atoms(atoms),
        "symbols": list(atoms.get_chemical_symbols()),
        "positions": [
            (float(position[0]), float(position[1]), float(position[2]))
            for position in atoms.get_positions()
        ],
        "cell": [
            (float(vector[0]), float(vector[1]), float(vector[2]))
            for vector in atoms.cell.array
        ],
        "molecule_indices": molecule_indices,
        "bb_indices": molecule_indices,
        "calculator": calculator,
        "calc": calculator,
        "steps": steps,
        "num_steps": steps,
        "max_steps": steps,
        "model": UMA_MODEL,
        "model_name": UMA_MODEL,
        "device": POTENTIAL_DEVICE,
        "task_name": UMA_TASK_NAME,
    }

    try:
        factory_signature = signature(factory)
        kwargs: dict[str, Any] = {}
        accepts_kwargs = any(
            parameter.kind == Parameter.VAR_KEYWORD
            for parameter in factory_signature.parameters.values()
        )
        if accepts_kwargs:
            kwargs = call_values
        else:
            kwargs = {
                name: call_values[name]
                for name in factory_signature.parameters
                if name in call_values
            }
        result = factory(**kwargs)
    except ValueError:
        result = factory(**call_values)
    except TypeError as error:
        raise PotentialConfigurationError(
            "Rigid-body optimizer could not be called with the supported backend "
            f"arguments. Set MOLFLOW_RIGID_BODY_FACTORY to a compatible adapter: {error}"
        ) from error

    return _coerce_optimized_atoms(result, atoms_for_optimizer)


def _load_calculator() -> Any:
    errors = potential_config_errors()
    if errors:
        raise PotentialConfigurationError(errors[0])

    try:
        if POTENTIAL_PROVIDER == "mace_off":
            from mace.calculators import mace_off

            return mace_off(
                model=POTENTIAL_MODEL,
                device=POTENTIAL_DEVICE,
                default_dtype=POTENTIAL_DTYPE,
            )

        if POTENTIAL_PROVIDER == "mace_mp":
            from mace.calculators import mace_mp

            return mace_mp(
                model=POTENTIAL_MODEL,
                device=POTENTIAL_DEVICE,
                default_dtype=POTENTIAL_DTYPE,
            )

        if POTENTIAL_PROVIDER == "uma":
            return _load_uma_calculator()

        module_name, function_name = POTENTIAL_CUSTOM_FACTORY.split(":", 1)
        factory = getattr(import_module(module_name), function_name)
        return factory(
            model=POTENTIAL_MODEL,
            device=POTENTIAL_DEVICE,
            default_dtype=POTENTIAL_DTYPE,
        )
    except PotentialConfigurationError:
        raise
    except Exception as error:
        raise PotentialConfigurationError(
            f"Could not initialize {POTENTIAL_PROVIDER} potential: {error}"
        ) from error

    raise PotentialConfigurationError(f"Unsupported potential provider: {POTENTIAL_PROVIDER}")


class PotentialEvaluator:
    def __init__(self) -> None:
        try:
            from ase import Atoms
        except ImportError as error:
            raise PotentialConfigurationError(
                "ASE is required for energy filtering. Install the backend potential dependencies."
            ) from error

        self._atoms_class = Atoms
        self._calculator = _load_calculator()

    def evaluate(
        self,
        symbols: list[str],
        positions: list[tuple[float, float, float]],
        cell: list[tuple[float, float, float]],
        relaxation_steps: int,
        relaxation_fmax: float,
        molecule_indices: list[int] | None = None,
    ) -> PotentialResult:
        atoms = self._atoms_class(
            symbols=symbols,
            positions=positions,
            cell=cell,
            pbc=True,
        )
        atoms.calc = self._calculator
        optimized = False
        optimization_type: str | None = None
        optimization_steps = 0

        if POTENTIAL_PROVIDER == "uma":
            atoms = _run_rigid_body_optimization(
                atoms=atoms,
                calculator=self._calculator,
                molecule_indices=molecule_indices or [0 for _ in symbols],
                steps=RIGID_BODY_STEPS,
            )
            atoms.calc = self._calculator
            optimized = True
            optimization_type = "rigid-body"
            optimization_steps = RIGID_BODY_STEPS
        elif relaxation_steps > 0:
            from ase.optimize import FIRE

            optimizer = FIRE(atoms, logfile=None)
            optimizer.run(fmax=relaxation_fmax, steps=relaxation_steps)
            optimized = True
            optimization_type = "ase-fire"
            optimization_steps = relaxation_steps

        energy = float(atoms.get_potential_energy())
        forces = atoms.get_forces()
        max_force = max(
            (sqrt(float(force[0]) ** 2 + float(force[1]) ** 2 + float(force[2]) ** 2) for force in forces),
            default=0.0,
        )

        return PotentialResult(
            energy_ev=energy,
            max_force_ev_per_angstrom=max_force,
            positions=[
                (float(position[0]), float(position[1]), float(position[2]))
                for position in atoms.get_positions()
            ],
            cell=[
                (float(vector[0]), float(vector[1]), float(vector[2]))
                for vector in atoms.cell.array
            ],
            optimized=optimized,
            optimization_type=optimization_type,
            optimization_steps=optimization_steps,
            potential_provider=POTENTIAL_PROVIDER,
            potential_model=UMA_MODEL if POTENTIAL_PROVIDER == "uma" else POTENTIAL_MODEL,
        )
