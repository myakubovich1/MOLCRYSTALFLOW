# MolFlow backend with CCDC MolCrystalFlow v2

This folder is a server-copyable backend bundle for the MolCrystalFlow website.
It preserves the existing HTTP API and artifact names while replacing the
legacy OMC25 generator with the bundled CCDC v2 model.

## Included

- FastAPI job API used by the existing frontend.
- CCDC v2 model source under `runtime/ccdc-v2/molcrystalflow`.
- Epoch-436 checkpoint, the lowest validation-loss checkpoint in the supplied archive.
- Lab-supplied monomer preprocessing with seven geometric and two basic
  auxiliary descriptors.
- Model inputs constructed through the bundled MolCrystalFlow
  `preprocess_structure` implementation.
- Configurable Z=1 through Z=8 candidate generation, with Z=2 and Z=4
  selected by default for backward compatibility.
- Per-job output directories.
- Single-GPU execution locking.
- Pre- and post-optimization geometry and periodic clash filtering.
- UMA-s-1p2 energy ranking with the molecular-crystal OMC task after 10-step
  rigid-body optimization.
- Legacy OMC25 rollback mode.

The frontend already talks to the same backend API. It now displays UMA ranking
availability, candidate rank, and candidate energy when those fields are
returned by the backend.

## CCDC-v2 feature preprocessing

The backend now includes the monomer preprocessing supplied in the lab CSP
inference kit. The nine auxiliary descriptors are consumed raw by the
checkpoint; there is no separate scaler file.

The model requires exactly 13 node-extra dimensions:

```text
bb_num_vec:          1
PCA eigenvalues:     3
geometric descriptors: 7
basic descriptors:     2
total:              13
```

The default `MOLFLOW_V2_FEATURE_MODE=inference_kit` computes heavy-atom count,
molecular weight, radius of gyration, asphericity, eccentricity, planarity, and
three principal-component lengths. It also uses the bundled model runtime's
own `preprocess_structure` implementation for `local_coords`, PCA eigenvalues,
`axis_flips`, and building-block labels.

Eight supplied descriptor formulas match the available lab reference. The
inference kit explicitly identifies planarity as an approximation (`I2/I1`),
with an approximately 0.01 difference from its available CSD reference. Health
therefore reports a complete input payload but does not claim exact
training-feature parity.

The previous zero fallback is blocked unless it is deliberately enabled for
rollback diagnostics:

```bash
export MOLFLOW_V2_FEATURE_MODE=neutral
export MOLFLOW_V2_ALLOW_NEUTRAL_FEATURES=true
```

Do not use neutral mode for scientific generation. It reproduces the
out-of-distribution zero-filled inputs associated with compressed cells.

For Z greater than one, the current web workflow follows the inference kit's
default and supplies the same parity state for every molecular copy. The kit
also supports deliberately mirrored copies for known improper-symmetry cases,
but those alternatives are not automatically enumerated because doing so can
change stereochemical assumptions for chiral inputs.

## Copy to the lab server

From the laptop, create a clean bundle that excludes local jobs, `.env`, and
Python caches:

```bash
cd /Users/myakubovich/Documents/Projects/MolCrystalFlow/backend/docs/molflow-backend
bash package_for_server.sh /tmp/molflow-backend-v2.tar.gz
scp /tmp/molflow-backend-v2.tar.gz liu-group@10.136.38.140:~/
```

For the existing Google Drive workflow, create the equivalent ZIP:

```bash
bash package_for_server.sh ../molflow-backend.zip
```

Both formats contain the same backend files and deliberately exclude secrets
and generated job data.

On the lab computer:

```bash
ssh liu-group@10.136.38.140
source ~/miniforge3/etc/profile.d/conda.sh
conda activate molcrystalflow
mkdir -p ~/molflow-backend-v2
tar -xzf ~/molflow-backend-v2.tar.gz -C ~/molflow-backend-v2
cd ~/molflow-backend-v2
cp .env.example .env
```

Edit `.env` and set `MOLFLOW_API_TOKEN` to the same value as
`DESKTOP_BACKEND_TOKEN` in the frontend `.env.local`.

The copied environment should also contain:

```bash
MOLFLOW_SUPPORTED_Z_VALUES=1,2,3,4,5,6,7,8
MOLFLOW_DEFAULT_Z_VALUES=2,4
```

The first setting defines the values accepted by the backend API and advertised
to the frontend. The second setting only controls the initial frontend
selection and the backend default when a client omits `zValues`.

When copying an older `.env`, replace any previous neutral feature setting:

```bash
sed -i 's/^MOLFLOW_V2_FEATURE_MODE=.*/MOLFLOW_V2_FEATURE_MODE=inference_kit/' .env
sed -i 's/^MOLFLOW_V2_REQUIRE_EXACT_FEATURES=.*/MOLFLOW_V2_REQUIRE_EXACT_FEATURES=false/' .env
grep -n 'MOLFLOW_V2_FEATURE_MODE\|MOLFLOW_V2_REQUIRE_EXACT_FEATURES' .env
```

## Dependencies

The existing `molcrystalflow` environment should already contain PyTorch and
most graph dependencies. Verify:

```bash
python -c "import torch; print(torch.__version__, torch.version.cuda)"
python -c "import torch_geometric, torch_scatter, pytorch_lightning"
```

Install API and model dependencies:

```bash
python -m pip install -r requirements.txt
python -m pip install -r requirements-v2.txt
```

`torch-scatter` must match the installed PyTorch and CUDA builds. If pip cannot
find a compatible wheel, install it using the PyTorch Geometric wheel index for
the server's exact `torch` and CUDA versions rather than compiling an arbitrary
version.

## Verify and start

```bash
set -a
source .env
set +a
python verify_runtime.py
python smoke_test_v2.py
bash start.sh
```

Expected:

```text
MolFlow backend runtime verification passed.
Uvicorn running on http://0.0.0.0:8000
```

The startup script verifies the checkpoint SHA256 before launching.
Runtime verification also computes the bundled descriptors for cytosine and
checks the expected seven-plus-two feature layout. It also imports the actual
`csp-pipeline` rigid-constraint helper, so a stale `CSP_DIR` is detected before
generation. The smoke test generates one Z=2 cytosine candidate in
`smoke-output/`.

Before replacing the running backend, run the multi-sample end-to-end validator
while no other backend process is using the GPU:

```bash
bash validate_lab.sh --z-values 2 4 --num-samples 10
```

The wrapper loads `.env`, confirms the correct Conda environment, verifies the
runtime and scientific configuration, runs the unit suite and one-candidate
smoke test, then generates 20 fixed-seed candidates. The final stage runs
pre-optimization geometry screening, 10-step rigid-body optimization,
post-optimization periodic geometry screening, and UMA ranking. Results are
preserved under `validation-output/<UTC timestamp>/`, including
`candidates.json` and `validation-summary.json`. A nonzero exit means the
candidate backend should not replace the working deployment yet.

After the side-by-side smoke test passes, stop the old backend and switch names:

```bash
cd ~
mv molflow-backend molflow-backend-omc25
mv molflow-backend-v2 molflow-backend
cd ~/molflow-backend
bash start.sh
```

Keep `~/molflow-backend-omc25` until v2 has passed application-level regression
testing.

## Laptop frontend

No frontend code change is required:

```bash
cd /Users/myakubovich/Documents/Projects/MolCrystalFlow
npm run dev
```

Health check:

```bash
TOKEN=$(grep '^DESKTOP_BACKEND_TOKEN=' .env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $TOKEN" \
  http://10.136.38.140:8000/health
```

The health payload reports:

- `generatorBackend`
- `modelVersion`
- `supportedZValues`
- `defaultZValues`
- `zValueSupportDetail`
- `samplingSteps`
- `modelInputMode`
- `modelInputComplete`
- `modelInputExact`
- `modelInputDescriptorLayout`
- `modelInputDetail`
- `potentialAvailable`
- `potentialProvider`
- `potentialModel`
- `potentialTask`
- `energyRankingAvailable`
- `rigidBodyOptimizationAvailable`
- `rigidBodySteps`
- dependency or model-access errors when ranking is unavailable

## Generation flow

```text
POST /jobs
  -> write jobs/{jobId}/input/molecule.xyz
  -> acquire shared GPU lock
  -> compute 7 geometric + 2 basic inference-kit descriptors
  -> construct canonical molecular inputs with bundled preprocess_structure
  -> load CCDC v2 checkpoint
  -> generate jobs/{jobId}/generated/crystals_z*.xyz
  -> pre-optimization geometry/clash filtering
  -> 10-step rigid-body optimization through csp-pipeline when UMA is available
  -> post-optimization periodic geometry/clash filtering on final coordinates
  -> UMA-s-1p2/OMC energy scoring and ranking of final-screened candidates
  -> expose artifacts through GET /jobs/{jobId}/files/{name}
```

Generated artifacts:

- `raw_crystals_z*.xyz`
- `raw_pred_combined.xyz`
- `crystals_z*.xyz`
- `pred_combined.xyz`
- `individual_candidates.zip`, containing one XYZ file per accepted candidate
- `candidates.json`
- `raw_optimized_postcheck_rejected.xyz` when optimized candidates fail the
  final geometry check

## Filtering configuration

The configured scientific workflow is ranking, not cutoff rejection:

1. generated candidates
2. pre-optimization geometry and molecular clash filtering
3. rigid-body optimization for exactly 10 steps
4. repeat geometry and periodic clash filtering on the optimized coordinates
5. reject final structures that no longer pass the configured geometry policy
6. UMA-s-1p2/OMC energy scoring
7. sorting surviving candidates by energy

Configure the backend environment:

```bash
export MOLFLOW_POTENTIAL_PROVIDER=uma
export MOLFLOW_UMA_MODEL=uma-s-1p2
export MOLFLOW_UMA_TASK_NAME=omc
export MOLFLOW_POTENTIAL_DEVICE=cuda
export MOLFLOW_POTENTIAL_DTYPE=float32
export MOLFLOW_RIGID_BODY_STEPS=10
export MCF_ROOT=/home/liu-group/projects/MolCrystalFlow
export CSP_DIR=/home/liu-group/projects/MolCrystalFlow/csp-pipeline
export MOLFLOW_CSP_DIR=/home/liu-group/projects/MolCrystalFlow/csp-pipeline
python -m pip install -r requirements-potential.txt
```

`requirements-potential.txt` pins `fairchem-core==2.21.0`, the version already
validated in the lab environment. UMA model loading may also require whatever
model-access credentials the lab uses for fairchem/UMA pretrained models, such
as a Hugging Face token or fairchem cache that has already accepted the model
terms. Do not upgrade this dependency in-place without rechecking the installed
PyTorch, torchvision, PyTorch Geometric, and CUDA versions.

The rigid-body optimizer is not reimplemented in this backend. The backend
searches for known optimizer function names in `csp-pipeline`. If health reports
that rigid-body optimization is unavailable, set `MOLFLOW_RIGID_BODY_FACTORY`
to the existing function:

```bash
export MOLFLOW_RIGID_BODY_FACTORY=package.module:optimize_rigid_body
```

Do not point this at a new optimizer. It should be the rigid-body optimization
implementation already present in the lab `csp-pipeline` folder.

Returned candidate metadata includes separate `preOptimizationGeometry` and
`postOptimizationGeometry` records. Top-level geometry metrics always describe
the final exported coordinates when optimization ran. Metadata also includes
`rank`, `energy`, `energyUnits`, `energyType`, initial and final force values,
`optimized`, `optimizationType`, `optimizationSteps`, `optimizationProtocol`,
`potentialProvider`, `potentialModel`, `potentialTask`, and `scoringError` if
ranking could not run.

`individual_candidates.zip` preserves the same accepted structures as the
ranked combined files. Its `candidates.json` manifest maps each accepted record
to `individualArtifact`, the corresponding one-structure XYZ member. This
avoids reparsing a multi-frame XYZ file while preserving ranking, filtering,
energy, and provenance metadata.

The CCDC-v2 adapter constructs shape-correct inputs for Z=1 through Z=8, and the
server validation suite checks that full range. This is technical support, not
a claim that all Z values have equal predictive performance. Acceptance rates,
cell distributions, and known-crystal recovery should be benchmarked per Z
before drawing scientific conclusions.

The UMA value is total potential energy normalized per molecule for ranking
candidates with identical composition and settings. It is not a lattice energy,
free energy, crystallization energy, or proof of physical stability. Ten fixed
rigid-body steps are a preliminary ranking protocol, not a convergence claim.
Because uploaded XYZ files contain neither charge nor spin metadata, the OMC
calculator explicitly uses its neutral, spin-zero task convention. Inputs that
require a different electronic-state treatment are outside this API's current
scientific scope.

## Daily lab workflow

Backend on the lab computer:

```bash
source ~/miniforge3/etc/profile.d/conda.sh
conda activate molcrystalflow
cd ~/molflow-backend
bash start.sh
```

Frontend on the laptop:

```bash
cd /Users/myakubovich/Documents/Projects/MolCrystalFlow
npm run dev
```

Health check from the laptop:

```bash
TOKEN=$(grep '^DESKTOP_BACKEND_TOKEN=' /Users/myakubovich/Documents/Projects/MolCrystalFlow/.env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $TOKEN" http://10.136.38.140:8000/health
```

The health payload should show `potentialProvider: "uma"`,
`potentialModel: "uma-s-1p2"`, `rigidBodySteps: 10`, and
`energyRankingAvailable: true`. If it does not, read `energyRankingDetail` and
`rigidBodyDetail`; those fields are the next thing to fix.

## Legacy rollback

The previous CSP pipeline remains supported:

```bash
export MOLFLOW_GENERATOR_BACKEND=legacy
export MCF_ROOT=/home/liu-group/projects/MolCrystalFlow
export CSP_DIR=/home/liu-group/projects/MolCrystalFlow/csp-pipeline
export CKPT_PATH=/home/liu-group/projects/MolCrystalFlow/model-checkpoints/omc25-mcf/best.ckpt
bash start.sh
```

## Tests

Backend tests that do not require the model runtime:

```bash
PYTHONPATH=. python -m unittest discover -s tests
```

Syntax verification:

```bash
python -m compileall -q app runtime/ccdc-v2/molcrystalflow
```

An actual generation smoke test requires the lab PyTorch/CUDA environment and
should be performed before replacing the current backend directory.
