import unittest

from validate_end_to_end import validation_failures


def passing_summary() -> dict:
    return {
        "generatedCount": 2,
        "generatorInputComplete": True,
        "generatorFeatureMode": "inference_kit",
        "preOptimizationGeometryPassedCount": 2,
        "potentialFailedCount": 0,
        "energyRankingAvailable": True,
        "energyRankingUnavailableReason": None,
        "potentialProvider": "uma",
        "potentialModel": "uma-s-1p2",
        "potentialTask": "omc",
        "rigidBodySteps": 10,
        "energyRankedCount": 2,
        "acceptedCount": 2,
    }


def ranked_candidate(candidate_id: str, rank: int, energy: float) -> dict:
    return {
        "id": candidate_id,
        "rank": rank,
        "rankingStatus": "ranked",
        "energy": energy,
        "energyUnits": "eV/molecule",
        "relativeEnergyEvPerMolecule": energy + 2.0,
        "optimized": True,
        "optimizationType": "rigid-body",
        "optimizationSteps": 10,
        "potentialProvider": "uma",
        "potentialModel": "uma-s-1p2",
        "potentialTask": "omc",
        "accepted": True,
        "postOptimizationGeometry": {"geometryPassed": True},
    }


class ValidationContractTests(unittest.TestCase):
    def test_complete_ranked_manifest_passes(self):
        manifest = {
            "schemaVersion": 2,
            "candidates": [
                ranked_candidate("z2-0001", 1, -2.0),
                ranked_candidate("z2-0002", 2, -1.5),
            ],
        }
        self.assertEqual(
            validation_failures(passing_summary(), manifest, expected_count=2),
            [],
        )

    def test_missing_optimization_and_wrong_energy_order_fail(self):
        first = ranked_candidate("z2-0001", 1, -1.0)
        second = ranked_candidate("z2-0002", 2, -2.0)
        second["optimizationSteps"] = 9
        second["postOptimizationGeometry"] = None
        failures = validation_failures(
            passing_summary(),
            {"schemaVersion": 2, "candidates": [first, second]},
            expected_count=2,
        )
        self.assertTrue(any("optimizationSteps=9" in failure for failure in failures))
        self.assertTrue(any("post-optimization geometry" in failure for failure in failures))
        self.assertTrue(any("nondecreasing" in failure for failure in failures))


if __name__ == "__main__":
    unittest.main()
