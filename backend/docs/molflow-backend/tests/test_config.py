import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import config


class ScientificConfigurationTests(unittest.TestCase):
    def test_supported_z_values_default_to_one_through_eight(self):
        self.assertEqual(config.SUPPORTED_Z_VALUES, list(range(1, 9)))
        self.assertEqual(config.DEFAULT_Z_VALUES, [2, 4])
        capabilities = config.backend_capabilities()
        self.assertEqual(capabilities["supportedZValues"], list(range(1, 9)))
        self.assertEqual(capabilities["defaultZValues"], [2, 4])
        self.assertIn("benchmark", capabilities["zValueSupportDetail"])

    def test_positive_integer_list_configuration_is_sorted_and_deduplicated(self):
        with patch.dict(os.environ, {"TEST_Z_VALUES": "8, 1, 4, 4"}, clear=False):
            values = config.env_positive_int_list("TEST_Z_VALUES", [2, 4])
        self.assertEqual(values, [1, 4, 8])

    def test_positive_integer_list_configuration_rejects_invalid_values(self):
        with patch.dict(os.environ, {"TEST_Z_VALUES": "1,0,4"}, clear=False):
            with self.assertRaisesRegex(ValueError, "positive integers"):
                config.env_positive_int_list("TEST_Z_VALUES", [2, 4])

    def test_rigid_body_factory_runtime_validator_fails_closed(self):
        def fail_validation():
            raise RuntimeError("missing rigid constraint")

        module = SimpleNamespace(
            optimize_rigid_body=lambda: None,
            validate_molflow_rigid_body_runtime=fail_validation,
        )
        with patch.object(config, "import_module", return_value=module):
            error = config._factory_import_error("fake_adapter:optimize_rigid_body")

        self.assertIn("missing rigid constraint", error)

    def test_uma_requires_molecular_crystal_omc_task(self):
        with (
            patch.object(config, "POTENTIAL_PROVIDER", "uma"),
            patch.object(config, "UMA_MODEL", "uma-s-1p2"),
            patch.object(config, "UMA_TASK_NAME", "omat"),
        ):
            errors = config.potential_config_errors()

        self.assertTrue(any("must be 'omc'" in error for error in errors))

    def test_health_capabilities_report_uma_task(self):
        with (
            patch.object(config, "POTENTIAL_PROVIDER", "uma"),
            patch.object(config, "UMA_MODEL", "uma-s-1p2"),
            patch.object(config, "UMA_TASK_NAME", "omc"),
            patch.object(config, "potential_config_errors", return_value=[]),
            patch.object(config, "rigid_body_config_errors", return_value=[]),
        ):
            capabilities = config.backend_capabilities()

        self.assertEqual(capabilities["potentialProvider"], "uma")
        self.assertEqual(capabilities["potentialModel"], "uma-s-1p2")
        self.assertEqual(capabilities["potentialTask"], "omc")
        self.assertEqual(
            capabilities["potentialInputAssumptions"],
            {"charge": 0, "spin": 0, "source": "UMA-OMC task convention"},
        )
        self.assertTrue(capabilities["energyRankingAvailable"])

    def test_inference_kit_capabilities_report_complete_but_approximate_features(self):
        with (
            patch.object(config, "GENERATOR_BACKEND", "ccdc_v2"),
            patch.object(config, "V2_FEATURE_MODE", "inference_kit"),
            patch.object(config, "potential_config_errors", return_value=[]),
            patch.object(config, "rigid_body_config_errors", return_value=[]),
        ):
            capabilities = config.backend_capabilities()

        self.assertTrue(capabilities["modelInputComplete"])
        self.assertFalse(capabilities["modelInputExact"])
        self.assertEqual(capabilities["modelInputDescriptorLayout"]["geometric"], 7)
        self.assertEqual(capabilities["modelInputDescriptorLayout"]["basic"], 2)
        self.assertEqual(capabilities["modelInputDescriptorLayout"]["total"], 13)
        self.assertTrue(
            any("planarity" in item.lower() for item in capabilities["scientificLimitations"])
        )

    def test_neutral_feature_mode_requires_explicit_diagnostic_override(self):
        with (
            patch.object(config, "GENERATOR_BACKEND", "ccdc_v2"),
            patch.object(config, "V2_FEATURE_MODE", "neutral"),
            patch.object(config, "V2_ALLOW_NEUTRAL_FEATURES", False),
        ):
            errors = config.runtime_config_errors()

        self.assertTrue(any("zero-filled" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
