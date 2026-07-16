from pathlib import Path
import json
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from app.filtering import (
    analyze_geometry,
    parse_candidate,
    process_generated_outputs,
    split_multi_xyz,
)
from app.potential import PotentialResult


def structure(x_offset: float, z_value: int = 2) -> str:
    atom_rows = [
        f"H 1.000000 1.000000 1.000000 0",
        f"H {x_offset:.6f} 1.000000 1.000000 1",
    ]
    return "\n".join(
        [
            "2",
            'Lattice="10 0 0 0 10 0 0 0 10" Properties=species:S:1:pos:R:3:bb_indices:I:1 pbc="T T T"',
            *atom_rows,
        ]
    ) + "\n"


def options(**overrides):
    values = {
        "geometryEnabled": True,
        "clashThresholdRatio": 0.65,
        "maxClashCount": 0,
        "minDensityGcm3": None,
        "maxDensityGcm3": None,
        "energyEnabled": False,
        "maxRelativeEnergyEvPerMolecule": None,
        "relaxationSteps": 0,
        "relaxationFmaxEvPerAngstrom": 0.2,
        "maxForceEvPerAngstrom": None,
    }
    values.update(overrides)
    return values


class FakePotentialEvaluator:
    def evaluate(
        self,
        symbols,
        positions,
        cell,
        relaxation_steps,
        relaxation_fmax,
        molecule_indices=None,
    ):
        energy = 0.0 if positions[1][0] < 6.0 else 4.0
        return PotentialResult(
            energy_ev=energy,
            max_force_ev_per_angstrom=0.1,
            positions=positions,
            cell=cell,
            optimized=True,
            optimization_type="rigid-body",
            optimization_steps=10,
            optimization_protocol="fixed-step",
            potential_provider="uma",
            potential_model="uma-s-1p2",
            potential_task="omc",
        )


class ClashingPotentialEvaluator:
    def evaluate(
        self,
        symbols,
        positions,
        cell,
        relaxation_steps,
        relaxation_fmax,
        molecule_indices=None,
    ):
        optimized_positions = list(positions)
        optimized_positions[1] = (1.1, 1.0, 1.0)
        return PotentialResult(
            energy_ev=-2.0,
            max_force_ev_per_angstrom=0.3,
            positions=optimized_positions,
            cell=cell,
            optimized=True,
            optimization_type="rigid-body",
            optimization_steps=10,
            optimization_protocol="fixed-step",
            potential_provider="uma",
            potential_model="uma-s-1p2",
            potential_task="omc",
        )


class FilteringTests(unittest.TestCase):
    def test_geometry_accepts_separated_molecules(self):
        candidate = parse_candidate(structure(5.0), z_value=2, source_index=0)
        result = analyze_geometry(candidate, input_atom_count=1, options=options())

        self.assertTrue(result["geometryPassed"])
        self.assertEqual(result["clashCount"], 0)
        self.assertGreater(result["minimumVdwRatio"], 1.0)

    def test_geometry_rejects_periodic_intermolecular_clash(self):
        candidate = parse_candidate(structure(1.1), z_value=2, source_index=0)
        result = analyze_geometry(candidate, input_atom_count=1, options=options())

        self.assertFalse(result["geometryPassed"])
        self.assertEqual(result["clashCount"], 1)
        self.assertLess(result["minimumIntermolecularDistanceAngstrom"], 0.2)

    def test_geometry_rejects_molecule_collision_with_its_periodic_replica(self):
        block = "\n".join(
            [
                "1",
                'Lattice="1.2 0 0 0 1.2 0 0 0 1.2" Properties=species:S:1:pos:R:3:bb_indices:I:1 pbc="T T T"',
                "H 0.5 0.5 0.5 0",
            ]
        ) + "\n"
        candidate = parse_candidate(block, z_value=1, source_index=0)
        result = analyze_geometry(candidate, input_atom_count=1, options=options())

        self.assertFalse(result["geometryPassed"])
        self.assertGreater(result["periodicSelfImageClashCount"], 0)
        self.assertTrue(result["minimumContact"]["periodicSelfImage"])

    def test_geometry_finds_short_image_in_highly_skewed_cell(self):
        block = "\n".join(
            [
                "1",
                'Lattice="10 0 0 19.9 0.1 0 0 0 10" Properties=species:S:1:pos:R:3:bb_indices:I:1 pbc="T T T"',
                "H 0.5 0.5 0.5 0",
            ]
        ) + "\n"
        candidate = parse_candidate(block, z_value=1, source_index=0)
        result = analyze_geometry(candidate, input_atom_count=1, options=options())

        self.assertFalse(result["geometryPassed"])
        self.assertAlmostEqual(
            result["minimumIntermolecularDistanceAngstrom"],
            2 ** 0.5 / 10,
            places=6,
        )

    @patch("app.filtering.PotentialEvaluator", FakePotentialEvaluator)
    def test_energy_window_rejects_high_relative_energy(self):
        with TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            generated = root / "generated"
            artifacts = root / "artifacts"
            generated.mkdir()
            (generated / "crystals_z2.xyz").write_text(structure(5.0) + structure(7.0))
            (generated / "pred_combined.xyz").write_text(structure(5.0) + structure(7.0))

            _, summary = process_generated_outputs(
                generated_dir=generated,
                artifacts_dir=artifacts,
                input_atom_count=1,
                z_values=[2],
                options=options(
                    energyEnabled=True,
                    maxRelativeEnergyEvPerMolecule=1.0,
                ),
            )

            self.assertEqual(summary["generatedCount"], 2)
            self.assertEqual(summary["potentialAttemptedCount"], 2)
            self.assertEqual(summary["energyRejectedCount"], 1)
            self.assertEqual(summary["acceptedCount"], 1)
            self.assertTrue((artifacts / "raw_crystals_z2.xyz").exists())
            self.assertTrue((artifacts / "candidates.json").exists())

    @patch("app.filtering.POTENTIAL_PROVIDER", "uma")
    @patch("app.filtering.UMA_MODEL", "uma-s-1p2")
    @patch("app.filtering.POTENTIAL_MODEL", "uma-s-1p2")
    @patch("app.filtering.RIGID_BODY_STEPS", 10)
    @patch("app.filtering.PotentialEvaluator", FakePotentialEvaluator)
    def test_uma_ranking_sorts_without_cutoff_rejection(self):
        with TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            generated = root / "generated"
            artifacts = root / "artifacts"
            generated.mkdir()
            (generated / "crystals_z2.xyz").write_text(structure(7.0) + structure(5.0))
            (generated / "pred_combined.xyz").write_text(structure(7.0) + structure(5.0))

            _, summary = process_generated_outputs(
                generated_dir=generated,
                artifacts_dir=artifacts,
                input_atom_count=1,
                z_values=[2],
                options=options(),
            )

            report = json.loads((artifacts / "candidates.json").read_text())
            accepted = [entry for entry in report["candidates"] if entry["accepted"]]

            self.assertEqual(summary["acceptedCount"], 2)
            self.assertEqual(summary["energyRejectedCount"], 0)
            self.assertEqual(summary["energyRankedCount"], 2)
            self.assertEqual([entry["rank"] for entry in accepted], [2, 1])
            self.assertEqual(accepted[1]["energyUnits"], "eV/molecule")
            self.assertEqual(accepted[1]["potentialTask"], "omc")
            self.assertEqual(
                accepted[1]["minimumVdwRatio"],
                accepted[1]["postOptimizationGeometry"]["minimumVdwRatio"],
            )
            exported_blocks = split_multi_xyz(
                (artifacts / "crystals_z2.xyz").read_text()
            )
            exported_rank_one = parse_candidate(exported_blocks[0], 2, 0)
            exported_geometry = analyze_geometry(
                exported_rank_one,
                input_atom_count=1,
                options=options(),
            )
            rank_one = next(entry for entry in accepted if entry["rank"] == 1)
            self.assertAlmostEqual(
                exported_geometry["minimumVdwRatio"],
                rank_one["minimumVdwRatio"],
            )
            self.assertIn("'potential_task':'omc'", exported_rank_one.comment)

    @patch("app.filtering.POTENTIAL_PROVIDER", "uma")
    @patch("app.filtering.UMA_MODEL", "uma-s-1p2")
    @patch("app.filtering.POTENTIAL_MODEL", "uma-s-1p2")
    @patch("app.filtering.UMA_TASK_NAME", "omc")
    @patch("app.filtering.RIGID_BODY_STEPS", 10)
    @patch("app.filtering.PotentialEvaluator", ClashingPotentialEvaluator)
    def test_post_optimization_clash_is_rejected_and_preserved_for_audit(self):
        with TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            generated = root / "generated"
            artifacts = root / "artifacts"
            generated.mkdir()
            (generated / "crystals_z2.xyz").write_text(structure(5.0))
            (generated / "pred_combined.xyz").write_text(structure(5.0))

            _, summary = process_generated_outputs(
                generated_dir=generated,
                artifacts_dir=artifacts,
                input_atom_count=1,
                z_values=[2],
                options=options(),
            )

            report = json.loads((artifacts / "candidates.json").read_text())
            candidate = report["candidates"][0]

            self.assertEqual(summary["preOptimizationGeometryPassedCount"], 1)
            self.assertEqual(summary["postOptimizationGeometryRejectedCount"], 1)
            self.assertEqual(summary["energyRankedCount"], 0)
            self.assertEqual(summary["acceptedCount"], 0)
            self.assertEqual(candidate["status"], "post_geometry_rejected")
            self.assertFalse(candidate["accepted"])
            self.assertLess(candidate["minimumVdwRatio"], 0.65)
            self.assertFalse((artifacts / "crystals_z2.xyz").exists())
            self.assertTrue((artifacts / "raw_optimized_postcheck_rejected.xyz").exists())

    @patch("app.filtering.POTENTIAL_PROVIDER", "uma")
    @patch("app.filtering.UMA_MODEL", "uma-s-1p2")
    @patch("app.filtering.POTENTIAL_MODEL", "uma-s-1p2")
    @patch("app.filtering.RIGID_BODY_STEPS", 10)
    @patch("app.filtering.PotentialEvaluator", side_effect=RuntimeError("fairchem-core missing"))
    def test_uma_unavailable_rejects_unranked_candidates(self, _mock_evaluator):
        with TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            generated = root / "generated"
            artifacts = root / "artifacts"
            generated.mkdir()
            (generated / "crystals_z2.xyz").write_text(structure(5.0))
            (generated / "pred_combined.xyz").write_text(structure(5.0))

            _, summary = process_generated_outputs(
                generated_dir=generated,
                artifacts_dir=artifacts,
                input_atom_count=1,
                z_values=[2],
                options=options(),
            )

            report = json.loads((artifacts / "candidates.json").read_text())
            candidate = report["candidates"][0]

            self.assertEqual(summary["acceptedCount"], 0)
            self.assertEqual(summary["potentialFailedCount"], 1)
            self.assertEqual(candidate["potentialStatus"], "unavailable")
            self.assertEqual(candidate["rankingStatus"], "unavailable")
            self.assertEqual(candidate["status"], "potential_failed")
            self.assertFalse(candidate["accepted"])
            self.assertIn("fairchem-core missing", candidate["scoringError"])


if __name__ == "__main__":
    unittest.main()
