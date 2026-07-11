from pathlib import Path
import hashlib
import unittest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = BACKEND_ROOT / "runtime" / "ccdc-v2"
CHECKPOINT_PATH = RUNTIME_ROOT / "checkpoints" / "best.ckpt"
CONFIG_PATH = RUNTIME_ROOT / "checkpoints" / "config.yaml"
EXPECTED_SHA256 = "cf841452a9eb9bc2300e760ef5fe072337167e8fcd87adf91408804c60b873bf"


class RuntimeBundleTests(unittest.TestCase):
    def test_v2_runtime_source_is_bundled(self):
        self.assertTrue(
            (RUNTIME_ROOT / "molcrystalflow" / "models" / "molcrystalflow.py").is_file()
        )
        self.assertTrue(
            (RUNTIME_ROOT / "molcrystalflow" / "configs" / "ccdc_model.yaml").is_file()
        )

    def test_best_checkpoint_and_config_are_bundled(self):
        self.assertTrue(CHECKPOINT_PATH.is_file())
        self.assertTrue(CONFIG_PATH.is_file())

    def test_best_checkpoint_hash(self):
        digest = hashlib.sha256(CHECKPOINT_PATH.read_bytes()).hexdigest()
        self.assertEqual(digest, EXPECTED_SHA256)


if __name__ == "__main__":
    unittest.main()
