import unittest
from unittest.mock import patch

from app import potential


class FakeCell:
    array = ((10.0, 0.0, 0.0), (0.0, 10.0, 0.0), (0.0, 0.0, 10.0))


class FakeAtoms:
    latest = None

    def __init__(self, *, symbols, positions, cell, pbc):
        self.symbols = symbols
        self.positions = positions
        self.cell = FakeCell()
        self.pbc = pbc
        self.info = {}
        self.calc = None
        FakeAtoms.latest = self

    def get_potential_energy(self):
        return -1.0

    def get_forces(self):
        return [(0.0, 0.0, 0.0) for _ in self.positions]

    def get_positions(self):
        return self.positions


class PotentialEvaluatorTests(unittest.TestCase):
    @patch("app.potential._run_rigid_body_optimization", side_effect=lambda **kwargs: kwargs["atoms"])
    @patch.object(potential, "UMA_TASK_NAME", "omc")
    @patch.object(potential, "UMA_MODEL", "uma-s-1p2")
    @patch.object(potential, "POTENTIAL_PROVIDER", "uma")
    def test_omc_evaluation_sets_explicit_neutral_spin_zero_inputs(self, _optimizer):
        evaluator = potential.PotentialEvaluator.__new__(potential.PotentialEvaluator)
        evaluator._atoms_class = FakeAtoms
        evaluator._calculator = object()
        evaluator._potential_package_version = "2.21.0"
        evaluator._ase_version = "test"

        result = evaluator.evaluate(
            symbols=["C", "H"],
            positions=[(0.0, 0.0, 0.0), (1.0, 0.0, 0.0)],
            cell=[(10.0, 0.0, 0.0), (0.0, 10.0, 0.0), (0.0, 0.0, 10.0)],
            relaxation_steps=10,
            relaxation_fmax=0.2,
            molecule_indices=[0, 0],
        )

        self.assertEqual(FakeAtoms.latest.info, {"charge": 0, "spin": 0})
        self.assertEqual(result.potential_provider, "uma")
        self.assertEqual(result.potential_model, "uma-s-1p2")
        self.assertEqual(result.potential_task, "omc")
        self.assertEqual(result.optimization_steps, 10)


if __name__ == "__main__":
    unittest.main()
