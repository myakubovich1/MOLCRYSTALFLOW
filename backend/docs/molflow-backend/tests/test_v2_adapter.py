from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from app.filtering import parse_candidate
from app.v2_features import V2InputError, serialize_candidate


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


if __name__ == "__main__":
    unittest.main()
