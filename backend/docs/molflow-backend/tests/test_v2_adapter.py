from importlib.util import find_spec
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from app.filtering import parse_candidate
from app.v2_features import (
    V2InputError,
    build_auxiliary_features,
    prepare_molecule,
    serialize_candidate,
)
from app.v2_generator import _build_batch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = BACKEND_ROOT / "runtime" / "ccdc-v2"


class V2AdapterTests(unittest.TestCase):
    def test_serialized_candidate_matches_filtering_contract(self):
        block = serialize_candidate(
            symbols=("C", "H"),
            coordinates=[
                [1.0, 1.0, 1.0],
                [1.8, 1.0, 1.0],
                [5.0, 5.0, 5.0],
                [5.8, 5.0, 5.0],
            ],
            lattice=[
                [10.0, 0.0, 0.0],
                [0.0, 10.0, 0.0],
                [0.0, 0.0, 10.0],
            ],
            z_value=2,
            sample_index=0,
            model_name="ccdc-v2-test",
            feature_provenance="unit-test",
        )

        candidate = parse_candidate(block, z_value=2, source_index=0)
        self.assertEqual(len(candidate.atoms), 4)
        self.assertEqual({atom.molecule_index for atom in candidate.atoms}, {0, 1})
        self.assertIn('Properties=species:S:1:pos:R:3:bb_indices:I:1', block)

    def test_serialized_candidate_rejects_singular_lattice(self):
        with self.assertRaises(V2InputError):
            serialize_candidate(
                symbols=("H",),
                coordinates=[[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]],
                lattice=[
                    [1.0, 0.0, 0.0],
                    [1.0, 0.0, 0.0],
                    [0.0, 0.0, 1.0],
                ],
                z_value=2,
                sample_index=0,
                model_name="ccdc-v2-test",
                feature_provenance="unit-test",
            )

    def test_runner_builds_job_local_v2_command(self):
        from app import runner

        with TemporaryDirectory() as temporary_directory:
            job_dir = Path(temporary_directory) / "abcdef1234567890"
            job_dir.mkdir()
            with patch.object(runner, "GENERATOR_BACKEND", "ccdc_v2"):
                command = runner.build_command(job_dir, [2, 4], 20)

        self.assertEqual(command[1:3], ["-m", "app.v2_cli"])
        self.assertIn(str(job_dir / "generated"), command)
        self.assertIn("--num-timesteps", command)
        self.assertIn("--gpu-lock", command)
        self.assertNotIn("csp_pipeline.py", command)

    @unittest.skipUnless(
        find_spec("torch") is not None and find_spec("torch_geometric") is not None,
        "MolCrystalFlow runtime dependencies are not installed",
    )
    def test_batch_uses_bundled_preprocess_structure_contract_for_z_one_through_eight(self):
        import numpy as np
        import torch
        from torch_geometric.data import Batch, Data

        runtime_text = str(RUNTIME_ROOT)
        if runtime_text not in sys.path:
            sys.path.insert(0, runtime_text)
        from molcrystalflow.data.dataset import preprocess_structure

        molecule = prepare_molecule(BACKEND_ROOT / "examples" / "cytosine.xyz")
        auxiliary = build_auxiliary_features(molecule, mode="inference_kit")
        for z_value in range(1, 9):
            with self.subTest(z_value=z_value):
                batch = _build_batch(
                    molecule=molecule,
                    auxiliary=auxiliary,
                    z_value=z_value,
                    torch_module=torch,
                    data_class=Data,
                    batch_class=Batch,
                    preprocess_structure=preprocess_structure,
                    device=torch.device("cpu"),
                )

                positions = np.concatenate(
                    [molecule.coordinates for _ in range(z_value)],
                    axis=0,
                )
                atom_types = np.tile(molecule.atomic_numbers, z_value)
                bb_indices = np.repeat(np.arange(z_value), molecule.atom_count)
                expected = preprocess_structure(
                    np.eye(3) * 20.0,
                    positions,
                    atom_types,
                    bb_indices,
                )

                self.assertTrue(torch.equal(batch.local_coords, expected["local_coords"]))
                self.assertTrue(torch.equal(batch.eigenvalues, expected["eigenvalues"]))
                self.assertTrue(torch.equal(batch.axis_flips, expected["axis_flips"]))
                self.assertEqual(tuple(batch.geometric_features.shape), (z_value, 7))
                self.assertEqual(tuple(batch.basic_features.shape), (z_value, 2))


if __name__ == "__main__":
    unittest.main()
