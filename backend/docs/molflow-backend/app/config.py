from contextlib import contextmanager
from importlib import import_module
from importlib.util import find_spec
from pathlib import Path
import os
import sys

HOME = Path.home()
PACKAGE_ROOT = Path(__file__).resolve().parents[1]

BACKEND_ROOT = Path(os.environ.get("BACKEND_ROOT", str(PACKAGE_ROOT))).expanduser().resolve()
JOBS_DIR = BACKEND_ROOT / "jobs"

GENERATOR_BACKEND = os.environ.get("MOLFLOW_GENERATOR_BACKEND", "ccdc_v2").strip().lower()
SUPPORTED_GENERATOR_BACKENDS = {"ccdc_v2", "legacy"}

MCF_ROOT = Path(
    os.environ.get("MCF_ROOT", str(HOME / "projects" / "MolCrystalFlow"))
).expanduser()
CSP_DIR = Path(
    os.environ.get(
        "MOLFLOW_CSP_DIR",
        os.environ.get("CSP_DIR", str(MCF_ROOT / "csp-pipeline")),
    )
).expanduser()
CSP_SRC_DIR = CSP_DIR / "src"
CKPT_PATH = Path(
    os.environ.get(
        "CKPT_PATH",
        str(MCF_ROOT / "model-checkpoints" / "omc25-mcf" / "best.ckpt"),
    )
).expanduser()

V2_RUNTIME_ROOT = Path(
    os.environ.get(
        "MOLFLOW_V2_RUNTIME_ROOT",
        str(BACKEND_ROOT / "runtime" / "ccdc-v2"),
    )
).expanduser()
V2_PACKAGE_DIR = V2_RUNTIME_ROOT / "molcrystalflow"
V2_CHECKPOINT_PATH = Path(
    os.environ.get(
        "MOLFLOW_V2_CHECKPOINT_PATH",
        str(V2_RUNTIME_ROOT / "checkpoints" / "best.ckpt"),
    )
).expanduser()
V2_CONFIG_PATH = Path(
    os.environ.get(
        "MOLFLOW_V2_CONFIG_PATH",
        str(V2_RUNTIME_ROOT / "checkpoints" / "config.yaml"),
    )
).expanduser()
V2_DEVICE = os.environ.get("MOLFLOW_V2_DEVICE", "cuda:0").strip()
V2_FEATURE_MODE = os.environ.get(
    "MOLFLOW_V2_FEATURE_MODE",
    "inference_kit",
).strip().lower()
V2_FEATURE_FACTORY = os.environ.get("MOLFLOW_V2_FEATURE_FACTORY", "").strip()
V2_NUM_TIMESTEPS = int(os.environ.get("MOLFLOW_V2_NUM_TIMESTEPS", "50"))
V2_GPU_LOCK_PATH = Path(
    os.environ.get("MOLFLOW_V2_GPU_LOCK_PATH", "/tmp/molflow-ccdc-v2-gpu.lock")
).expanduser()
V2_MODEL_NAME = os.environ.get("MOLFLOW_V2_MODEL_NAME", "ccdc-v2-epoch436").strip()


def env_flag(name: str, default: bool = False) -> bool:
    raw_value = os.environ.get(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() not in {"0", "false", "no", "off"}


V2_REQUIRE_EXACT_FEATURES = env_flag("MOLFLOW_V2_REQUIRE_EXACT_FEATURES", False)
V2_ALLOW_NEUTRAL_FEATURES = env_flag("MOLFLOW_V2_ALLOW_NEUTRAL_FEATURES", False)

PYTHONPATH_VALUE = os.pathsep.join(
    value
    for value in [
        str(BACKEND_ROOT),
        str(V2_RUNTIME_ROOT),
        str(MCF_ROOT),
        str(CSP_DIR),
        str(CSP_SRC_DIR),
        os.environ.get("PYTHONPATH", ""),
    ]
    if value
)

DEFAULT_Z_VALUES   = [2, 4]
DEFAULT_NUM_SAMPLES = 20

API_TOKEN = os.environ.get("MOLFLOW_API_TOKEN", "change-this-in-production")

GENERATOR_OVERLAP_FILTER_ENABLED = (
    os.environ.get("MOLFLOW_GENERATOR_OVERLAP_FILTER", "true").strip().lower()
    not in {"0", "false", "no", "off"}
)

POTENTIAL_PROVIDER = os.environ.get("MOLFLOW_POTENTIAL_PROVIDER", "none").strip().lower()
UMA_MODEL = os.environ.get("MOLFLOW_UMA_MODEL", "uma-s-1p2").strip()
POTENTIAL_MODEL = os.environ.get(
    "MOLFLOW_POTENTIAL_MODEL",
    UMA_MODEL if POTENTIAL_PROVIDER == "uma" else "medium",
).strip()
POTENTIAL_DEVICE = os.environ.get("MOLFLOW_POTENTIAL_DEVICE", "cuda").strip()
POTENTIAL_DTYPE = os.environ.get("MOLFLOW_POTENTIAL_DTYPE", "float32").strip()
POTENTIAL_CUSTOM_FACTORY = os.environ.get("MOLFLOW_POTENTIAL_CUSTOM_FACTORY", "").strip()
UMA_TASK_NAME = os.environ.get("MOLFLOW_UMA_TASK_NAME", "omc").strip().lower()
RIGID_BODY_STEPS = int(os.environ.get("MOLFLOW_RIGID_BODY_STEPS", "10"))
RIGID_BODY_FACTORY = os.environ.get("MOLFLOW_RIGID_BODY_FACTORY", "").strip()
RIGID_BODY_FACTORY_CANDIDATES = [
    "app.rigid_body_adapter:optimize_rigid_body",
    "rigid_body_optimization:optimize_rigid_body",
    "rigid_body_optimization:run_rigid_body_optimization",
    "rigid_body_optimization:optimize",
    "rigid_body_optimizer:optimize_rigid_body",
    "rigid_body_optimizer:optimize",
    "rigid_body:optimize_rigid_body",
    "rigid_body:optimize",
    "csp_pipeline:optimize_rigid_body",
    "csp_pipeline:run_rigid_body_optimization",
    "csp_pipeline:rigid_body_optimization",
    "csp_pipeline:optimize",
    "csp_pipeline.rigid_body_optimization:optimize_rigid_body",
    "csp_pipeline.rigid_body_optimization:run_rigid_body_optimization",
    "csp_pipeline.rigid_body_optimization:optimize",
    "csp_pipeline.rigid_body:optimize_rigid_body",
    "csp_pipeline.rigid_body:optimize",
    "csp_pipeline.optimization.rigid_body:optimize_rigid_body",
    "csp_pipeline.optimization.rigid_body:optimize",
]


@contextmanager
def temporary_import_paths(paths: list[Path]):
    resolved_paths = [str(path) for path in paths if path]
    original_path = list(sys.path)
    for path in reversed(resolved_paths):
        if path and path not in sys.path:
            sys.path.insert(0, path)
    try:
        yield
    finally:
        sys.path[:] = original_path


def csp_import_paths() -> list[Path]:
    """Import roots used when loading lab-owned csp-pipeline adapters."""
    return [
        CSP_DIR,
        CSP_SRC_DIR,
        MCF_ROOT,
        MCF_ROOT / "csp-pipeline",
        MCF_ROOT / "csp-pipeline" / "src",
    ]


def runtime_config_errors() -> list[str]:
    errors = []

    if not API_TOKEN or API_TOKEN == "change-this-in-production":
        errors.append(
            "MOLFLOW_API_TOKEN is not configured with a production value."
        )

    if GENERATOR_BACKEND not in SUPPORTED_GENERATOR_BACKENDS:
        supported = ", ".join(sorted(SUPPORTED_GENERATOR_BACKENDS))
        return [
            f"Unsupported MOLFLOW_GENERATOR_BACKEND={GENERATOR_BACKEND!r}. "
            f"Supported values: {supported}."
        ]

    if GENERATOR_BACKEND == "legacy":
        if not CSP_DIR.is_dir():
            errors.append(f"CSP_DIR does not exist or is not a directory: {CSP_DIR}")
        if not CKPT_PATH.is_file():
            errors.append(f"CKPT_PATH does not exist or is not a file: {CKPT_PATH}")
        return errors

    if not V2_PACKAGE_DIR.is_dir():
        errors.append(
            "The bundled MolCrystalFlow v2 package is missing: "
            f"{V2_PACKAGE_DIR}"
        )
    if not V2_CHECKPOINT_PATH.is_file():
        errors.append(f"MolCrystalFlow v2 checkpoint is missing: {V2_CHECKPOINT_PATH}")
    if not V2_CONFIG_PATH.is_file():
        errors.append(f"MolCrystalFlow v2 checkpoint config is missing: {V2_CONFIG_PATH}")
    if V2_NUM_TIMESTEPS < 2:
        errors.append("MOLFLOW_V2_NUM_TIMESTEPS must be at least 2.")

    supported_feature_modes = {"inference_kit", "neutral", "factory"}
    if V2_FEATURE_MODE not in supported_feature_modes:
        errors.append(
            f"Unsupported MOLFLOW_V2_FEATURE_MODE={V2_FEATURE_MODE!r}. "
            f"Supported values: {', '.join(sorted(supported_feature_modes))}."
        )
    if V2_FEATURE_MODE == "factory" and ":" not in V2_FEATURE_FACTORY:
        errors.append(
            "MOLFLOW_V2_FEATURE_FACTORY must use "
            "'python.module:factory_function' when feature mode is 'factory'."
        )
    elif V2_FEATURE_MODE == "factory":
        feature_module = V2_FEATURE_FACTORY.split(":", 1)[0]
        try:
            feature_spec = find_spec(feature_module)
        except (ImportError, ModuleNotFoundError):
            feature_spec = None
        if feature_spec is None:
            errors.append(
                f"Configured v2 feature module {feature_module!r} is not importable."
            )
    if V2_FEATURE_MODE == "neutral" and not V2_ALLOW_NEUTRAL_FEATURES:
        errors.append(
            "MOLFLOW_V2_FEATURE_MODE=neutral is disabled because zero-filled "
            "descriptors produce out-of-distribution model inputs. Use "
            "MOLFLOW_V2_FEATURE_MODE=inference_kit, or explicitly set "
            "MOLFLOW_V2_ALLOW_NEUTRAL_FEATURES=true only for rollback diagnostics."
        )
    if V2_REQUIRE_EXACT_FEATURES and V2_FEATURE_MODE != "factory":
        errors.append(
            "Exact v2 features are required, but MOLFLOW_V2_FEATURE_MODE is not 'factory'."
        )

    required_modules = {
        "ase": "ASE",
        "hydra": "hydra-core",
        "numpy": "NumPy",
        "omegaconf": "OmegaConf",
        "pytorch_lightning": "PyTorch Lightning",
        "scipy": "SciPy",
        "spglib": "spglib",
        "torch": "PyTorch",
        "torch_cluster": "torch-cluster",
        "torch_geometric": "PyTorch Geometric",
        "torch_scatter": "torch-scatter",
        "tqdm": "tqdm",
    }
    for module_name, package_name in required_modules.items():
        try:
            module_spec = find_spec(module_name)
        except (ImportError, ModuleNotFoundError):
            module_spec = None
        if module_spec is None:
            errors.append(f"{package_name} is not installed in the backend environment.")

    return errors


def potential_config_errors() -> list[str]:
    if POTENTIAL_PROVIDER == "none":
        return ["MOLFLOW_POTENTIAL_PROVIDER is not configured."]

    supported = {"uma", "mace_off", "mace_mp", "custom"}
    if POTENTIAL_PROVIDER not in supported:
        return [
            "Unsupported MOLFLOW_POTENTIAL_PROVIDER "
            f"{POTENTIAL_PROVIDER!r}. Supported providers: {', '.join(sorted(supported))}."
        ]

    if POTENTIAL_PROVIDER == "uma" and UMA_MODEL != "uma-s-1p2":
        return [
            "MOLFLOW_UMA_MODEL must be 'uma-s-1p2' for the configured UMA ranking workflow."
        ]

    if POTENTIAL_PROVIDER == "uma" and UMA_TASK_NAME != "omc":
        return [
            "MOLFLOW_UMA_TASK_NAME must be 'omc' for molecular-crystal ranking; "
            f"received {UMA_TASK_NAME!r}."
        ]

    if POTENTIAL_PROVIDER == "custom" and ":" not in POTENTIAL_CUSTOM_FACTORY:
        return [
            "MOLFLOW_POTENTIAL_CUSTOM_FACTORY must use the form "
            "'python.module:factory_function' for the custom provider."
        ]

    if find_spec("ase") is None:
        return ["ASE is not installed in the backend environment."]

    if POTENTIAL_PROVIDER in {"mace_off", "mace_mp"} and find_spec("mace") is None:
        return ["mace-torch is not installed in the backend environment."]

    if POTENTIAL_PROVIDER == "uma" and find_spec("fairchem") is None:
        return [
            "fairchem-core is not installed in the backend environment, so UMA-s-1p2 cannot be loaded."
        ]

    if POTENTIAL_PROVIDER == "custom":
        module_name = POTENTIAL_CUSTOM_FACTORY.split(":", 1)[0]
        try:
            module_spec = find_spec(module_name)
        except (ImportError, ModuleNotFoundError):
            module_spec = None
        if module_spec is None:
            return [f"Custom potential module {module_name!r} is not importable."]

    return []


def _factory_import_error(factory_spec: str) -> str | None:
    if ":" not in factory_spec:
        return (
            f"Rigid-body optimizer factory {factory_spec!r} must use the form "
            "'python.module:function'."
        )

    module_name, function_name = factory_spec.split(":", 1)
    try:
        with temporary_import_paths(csp_import_paths()):
            module = import_module(module_name)
            getattr(module, function_name)
            runtime_validator = getattr(
                module,
                "validate_molflow_rigid_body_runtime",
                None,
            )
            if callable(runtime_validator):
                runtime_validator()
    except Exception as error:
        return f"Rigid-body optimizer factory {factory_spec!r} is not importable: {error}"

    return None


def _first_available_rigid_body_factory() -> str | None:
    for factory_spec in RIGID_BODY_FACTORY_CANDIDATES:
        if _factory_import_error(factory_spec) is None:
            return factory_spec
    return None


def rigid_body_config_errors() -> list[str]:
    if POTENTIAL_PROVIDER != "uma":
        return ["UMA-s-1p2 ranking is not configured."]

    errors: list[str] = []

    if RIGID_BODY_STEPS != 10:
        errors.append("MOLFLOW_RIGID_BODY_STEPS must be exactly 10.")

    if not CSP_DIR.is_dir():
        errors.append(f"csp-pipeline directory is not available: {CSP_DIR}")
        return errors

    if RIGID_BODY_FACTORY:
        factory_error = _factory_import_error(RIGID_BODY_FACTORY)
        if factory_error:
            errors.append(factory_error)
    elif _first_available_rigid_body_factory() is None:
        errors.append(
            "No supported rigid-body optimizer function was found in csp-pipeline. "
            "Set MOLFLOW_RIGID_BODY_FACTORY to the existing csp-pipeline function, "
            "for example 'package.module:optimize_rigid_body'."
        )

    return errors


def backend_capabilities() -> dict:
    potential_errors = potential_config_errors()
    rigid_body_errors = rigid_body_config_errors() if POTENTIAL_PROVIDER == "uma" else [
        "UMA-s-1p2 ranking is not configured."
    ]
    ranking_errors = potential_errors + rigid_body_errors
    using_neutral_features = (
        GENERATOR_BACKEND == "ccdc_v2" and V2_FEATURE_MODE == "neutral"
    )
    using_inference_kit_features = (
        GENERATOR_BACKEND == "ccdc_v2" and V2_FEATURE_MODE == "inference_kit"
    )
    complete_features = (
        GENERATOR_BACKEND != "ccdc_v2" or V2_FEATURE_MODE != "neutral"
    )
    exact_features_enforced = (
        GENERATOR_BACKEND == "ccdc_v2"
        and V2_FEATURE_MODE == "factory"
        and V2_REQUIRE_EXACT_FEATURES
    )
    scientific_limitations: list[str] = []
    if using_neutral_features:
        scientific_limitations.append(
            "The CCDC-v2 generator uses neutral zero placeholders for nine unavailable training descriptors."
        )
    if using_inference_kit_features:
        scientific_limitations.extend(
            [
                "The inference-kit planarity descriptor uses an I2/I1 approximation; "
                "the kit reports an approximately 0.01 difference from its available CSD reference.",
                "For Z greater than one, generation currently conditions all molecular "
                "copies on the same parity; improper-symmetry alternatives are not enumerated.",
            ]
        )
    if POTENTIAL_PROVIDER == "uma" and UMA_TASK_NAME == "omc":
        scientific_limitations.append(
            "The XYZ-only API does not collect charge or spin; UMA-OMC evaluations "
            "therefore use the task's neutral, spin-zero input convention."
        )
    if ranking_errors:
        scientific_limitations.append(ranking_errors[0])
    scientific_readiness = not scientific_limitations
    return {
        "geometryFiltering": True,
        "generatorOverlapFiltering": (
            GENERATOR_OVERLAP_FILTER_ENABLED
            if GENERATOR_BACKEND == "legacy"
            else False
        ),
        "potentialAvailable": not potential_errors,
        "potentialProvider": None if POTENTIAL_PROVIDER == "none" else POTENTIAL_PROVIDER,
        "potentialModel": (
            None
            if POTENTIAL_PROVIDER == "none"
            else UMA_MODEL if POTENTIAL_PROVIDER == "uma" else POTENTIAL_MODEL
        ),
        "potentialTask": UMA_TASK_NAME if POTENTIAL_PROVIDER == "uma" else None,
        "potentialInputAssumptions": (
            {"charge": 0, "spin": 0, "source": "UMA-OMC task convention"}
            if POTENTIAL_PROVIDER == "uma" and UMA_TASK_NAME == "omc"
            else None
        ),
        "potentialDetail": potential_errors[0] if potential_errors else f"{POTENTIAL_PROVIDER} is configured.",
        "energyRankingAvailable": not ranking_errors,
        "energyRankingDetail": (
            ranking_errors[0]
            if ranking_errors
            else "UMA-s-1p2 molecular-crystal ranking is configured with the OMC task."
        ),
        "rigidBodyOptimizationAvailable": not rigid_body_errors,
        "rigidBodySteps": RIGID_BODY_STEPS if POTENTIAL_PROVIDER == "uma" else None,
        "rigidBodyDetail": rigid_body_errors[0] if rigid_body_errors else "Rigid-body optimization is configured.",
        "generatorBackend": GENERATOR_BACKEND,
        "modelVersion": V2_MODEL_NAME if GENERATOR_BACKEND == "ccdc_v2" else "omc25-legacy",
        "supportedZValues": DEFAULT_Z_VALUES,
        "samplingSteps": V2_NUM_TIMESTEPS if GENERATOR_BACKEND == "ccdc_v2" else None,
        "modelInputMode": V2_FEATURE_MODE if GENERATOR_BACKEND == "ccdc_v2" else "legacy",
        "modelInputComplete": complete_features,
        "modelInputExact": (
            exact_features_enforced if GENERATOR_BACKEND == "ccdc_v2" else True
        ),
        "modelInputDescriptorLayout": (
            {
                "bbNum": 1,
                "pcaEigenvalues": 3,
                "geometric": 7,
                "basic": 2,
                "chemical": 0,
                "total": 13,
            }
            if GENERATOR_BACKEND == "ccdc_v2"
            else None
        ),
        "modelInputDetail": (
            "Known PCA features are used and the nine required training "
            "descriptors are set to zero."
            if using_neutral_features
            else (
                "The lab-supplied inference-kit descriptors are computed as seven "
                "geometric and two basic raw features; planarity is approximate."
                if using_inference_kit_features
                else (
                    "An exact feature factory is configured and enforced."
                    if exact_features_enforced
                    else "A feature factory is configured, but exactness is not enforced."
                )
            )
        ) if GENERATOR_BACKEND == "ccdc_v2" else "The legacy CSP pipeline supplies model features.",
        "scientificReadiness": scientific_readiness,
        "scientificReadinessLevel": (
            "screened-ranking"
            if scientific_readiness
            else "screened-ranking-with-documented-limitations"
        ),
        "scientificLimitations": scientific_limitations,
        "scientificScope": (
            "Generated, final-geometry-screened, UMA-ranked candidates; "
            "not validated stable crystals."
        ),
    }
