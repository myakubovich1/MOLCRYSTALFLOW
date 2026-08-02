from pathlib import Path
import unittest
from unittest.mock import patch

try:
    import numpy as np
except ModuleNotFoundError:
    np = None

from app.v2_auxiliary_features import (
    BASIC_FEATURE_NAMES,
    FEATURE_PROVENANCE,
    GEOMETRIC_FEATURE_NAMES,
    compute_auxiliary_features,
    split_basic_geometric,
)
from app.v2_features import (
    V2FeatureError,
    build_auxiliary_features,
    prepare_molecule,
)


BACKEND_ROOT = Path(__file__).resolve().parents[1]
ACACPD_PATH = BACKEND_ROOT / "tests" / "fixtures" / "acacpd.xyz"


@unittest.skipIf(np is None, "NumPy is not installed")
class V2AuxiliaryFeatureTests(unittest.TestCase):
    def test_acacpd_matches_lab_inference_kit_reference(self):
        molecule = prepare_molecule(ACACPD_PATH)
        descriptors = compute_auxiliary_features(
            molecule.coordinates,
            molecule.symbols,
        )

        expected = {
            "num_heavy_atoms": 15.0,
            "molecular_weight": 304.638,
            "radius_of_gyration": 2.6005426454458886,
            "asphericity": 3.7826933015213315,
            "eccentricity": 0.9981234378807706,
            "planarity": 0.4122310437132587,
            "principal_component_1_length": 8.33805601040949,
            "principal_component_2_length": 6.546966273467925,
            "principal_component_3_length": 1.7667511062742776,
        }
        for name, expected_value in expected.items():
            self.assertAlmostEqual(descriptors[name], expected_value, places=6)

    def test_descriptor_layout_matches_checkpoint(self):
        molecule = prepare_molecule(ACACPD_PATH)
        descriptors = compute_auxiliary_features(
            molecule.coordinates,
            molecule.symbols,
        )
        basic, geometric = split_basic_geometric(descriptors)

        self.assertEqual(tuple(basic.shape), (2,))
        self.assertEqual(tuple(geometric.shape), (7,))
        self.assertEqual(len(BASIC_FEATURE_NAMES), 2)
        self.assertEqual(len(GEOMETRIC_FEATURE_NAMES), 7)
        self.assertEqual(1 + 3 + len(geometric) + len(basic), 13)
        self.assertTrue(np.isfinite(basic).all())
        self.assertTrue(np.isfinite(geometric).all())

    def test_descriptors_are_rigid_transform_and_reflection_invariant(self):
        molecule = prepare_molecule(ACACPD_PATH)
        original = compute_auxiliary_features(
            molecule.coordinates,
            molecule.symbols,
        )
        rotation = np.asarray(
            [
                [0.0, -1.0, 0.0],
                [1.0, 0.0, 0.0],
                [0.0, 0.0, 1.0],
            ]
        )
        transformed_coordinates = (
            molecule.coordinates @ rotation
            + np.asarray([123.4, -87.2, 19.1])
        )
        reflected_coordinates = molecule.coordinates * np.asarray([-1.0, 1.0, 1.0])

        transformed = compute_auxiliary_features(
            transformed_coordinates,
            molecule.symbols,
        )
        reflected = compute_auxiliary_features(
            reflected_coordinates,
            molecule.symbols,
        )
        for name in (*BASIC_FEATURE_NAMES, *GEOMETRIC_FEATURE_NAMES):
            self.assertAlmostEqual(original[name], transformed[name], places=10)
            self.assertAlmostEqual(original[name], reflected[name], places=10)

    def test_inference_kit_mode_is_complete_and_reports_planarity_caveat(self):
        molecule = prepare_molecule(ACACPD_PATH)
        features = build_auxiliary_features(molecule, mode="inference_kit")

        self.assertEqual(features.provenance, FEATURE_PROVENANCE)
        self.assertTrue(features.complete)
        self.assertFalse(features.exact)
        self.assertTrue(any("planarity" in item.lower() for item in features.limitations))
        self.assertEqual(tuple(features.geometric.shape), (7,))
        self.assertEqual(tuple(features.basic.shape), (2,))
        self.assertIsNone(features.chemical)

    def test_neutral_mode_is_dimensionally_valid_but_incomplete(self):
        molecule = prepare_molecule(ACACPD_PATH)
        features = build_auxiliary_features(molecule, mode="neutral")

        self.assertFalse(features.complete)
        self.assertFalse(features.exact)
        self.assertTrue(np.array_equal(features.geometric, np.zeros(7)))
        self.assertTrue(np.array_equal(features.basic, np.zeros(2)))

    def test_factory_must_use_the_supplied_seven_plus_two_layout(self):
        molecule = prepare_molecule(ACACPD_PATH)
        bad_factory = lambda **_: {
            "geometric_features": np.zeros(4),
            "basic_features": np.zeros(5),
            "chemical_features": None,
            "complete": True,
            "exact": True,
        }

        with patch("app.v2_features._load_factory", return_value=bad_factory):
            with self.assertRaisesRegex(V2FeatureError, "seven geometric"):
                build_auxiliary_features(
                    molecule,
                    mode="factory",
                    factory_path="test.module:factory",
                )


if __name__ == "__main__":
    unittest.main()
