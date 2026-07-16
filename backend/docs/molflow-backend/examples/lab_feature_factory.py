"""Template for a future exact CCDC-v2 training-feature adapter.

Install the completed module in the backend environment and configure:

MOLFLOW_V2_FEATURE_MODE=factory
MOLFLOW_V2_FEATURE_FACTORY=lab_package.features:build_features
MOLFLOW_V2_REQUIRE_EXACT_FEATURES=true
"""


def build_features(
    *,
    symbols,
    atomic_numbers,
    coordinates,
    centered_coordinates,
    local_coordinates,
    eigenvalues,
    axis_flips,
):
    """Return descriptors in the checkpoint's exact column order.

    The total node-extra dimension must be:

      bb_num_vec (1)
      + eigenvalues (3)
      + geometric_features (7)
      + basic_features (2)
      + chemical_features (0)
      = 13
    """
    raise NotImplementedError(
        "Replace this template with the exact lab preprocessing implementation."
    )

    # Expected return shape:
    # return {
    #     "geometric_features": geometric_vector,
    #     "basic_features": basic_vector,
    #     "chemical_features": None,
    #     "provenance": "independently-verified-exact-implementation",
    #     "complete": True,
    #     "exact": True,
    # }
