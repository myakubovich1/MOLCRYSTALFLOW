# MolFlow backend with CCDC MolCrystalFlow v2

This folder is a server-copyable backend bundle for the MolCrystalFlow website.
It preserves the existing HTTP API and artifact names while replacing the
legacy OMC25 generator with the bundled CCDC v2 model.

## Included

- FastAPI job API used by the existing frontend.
- CCDC v2 model source under `runtime/ccdc-v2/molcrystalflow`.
- Epoch-436 checkpoint, the lowest validation-loss checkpoint in the supplied archive.
- Single-XYZ to PyTorch Geometric inference adapter.
- Z=2 and Z=4 candidate generation.
- Per-job output directories.
- Single-GPU execution locking.
- Geometry and periodic clash filtering.
- UMA-s-1p2 energy ranking after 10-step rigid-body optimization.
- Legacy OMC25 rollback mode.

The frontend already talks to the same backend API. It now displays UMA ranking
availability, candidate rank, and candidate energy when those fields are
returned by the backend.

## Important feature limitation

The supplied v2 archive did not include the preprocessing implementation that
generated the checkpoint's normalized `basic_features` and
`geometric_features`.

The model requires exactly 13 node-extra dimensions:

```text
bb_num_vec:          1
PCA eigenvalues:     3
missing descriptors: 9
total:              13
```

The backend defaults to `MOLFLOW_V2_FEATURE_MODE=neutral`. This computes the
known PCA data exactly and supplies zero for the nine missing normalized
descriptors. This is technically executable and useful for integration and
benchmarking, but it is not guaranteed to reproduce the lab's intended model
quality.

For scientifically equivalent inference, install the lab feature function and
use:

```bash
export MOLFLOW_V2_FEATURE_MODE=factory
export MOLFLOW_V2_FEATURE_FACTORY=lab_package.features:build_features
export MOLFLOW_V2_REQUIRE_EXACT_FEATURES=true
```

The required function contract is documented in
`examples/lab_feature_factory.py`.

## Copy to the lab server

From the laptop, create a clean bundle that excludes local jobs, `.env`, and
Python caches:

```bash
cd /Users/myakubovich/Documents/Projects/MolCrystalFlow/backend/docs/molflow-backend
bash package_for_server.sh /tmp/molflow-backend-v2.tar.gz
scp /tmp/molflow-backend-v2.tar.gz liu-group@10.136.38.140:~/
```

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
The smoke test generates one Z=2 cytosine candidate in `smoke-output/`.

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
- `samplingSteps`
- `modelInputMode`
- `modelInputExact`
- `potentialAvailable`
- `potentialProvider`
- `potentialModel`
- `energyRankingAvailable`
- `rigidBodyOptimizationAvailable`
- `rigidBodySteps`
- dependency or model-access errors when ranking is unavailable

## Generation flow

```text
POST /jobs
  -> write jobs/{jobId}/input/molecule.xyz
  -> acquire shared GPU lock
  -> load CCDC v2 checkpoint
  -> generate jobs/{jobId}/generated/crystals_z*.xyz
  -> geometry/clash filtering
  -> 10-step rigid-body optimization through csp-pipeline when UMA is available
  -> UMA-s-1p2 energy scoring and ranking
  -> expose artifacts through GET /jobs/{jobId}/files/{name}
```

Generated artifacts:

- `raw_crystals_z*.xyz`
- `raw_pred_combined.xyz`
- `crystals_z*.xyz`
- `pred_combined.xyz`
- `candidates.json`

## Filtering configuration

The configured scientific workflow is ranking, not cutoff rejection:

1. generated candidates
2. geometry and molecular clash filtering
3. rigid-body optimization for exactly 10 steps
4. UMA-s-1p2 energy scoring
5. sorting by energy

Configure the backend environment:

```bash
export MOLFLOW_POTENTIAL_PROVIDER=uma
export MOLFLOW_UMA_MODEL=uma-s-1p2
export MOLFLOW_UMA_TASK_NAME=omat
export MOLFLOW_POTENTIAL_DEVICE=cuda
export MOLFLOW_POTENTIAL_DTYPE=float32
export MOLFLOW_RIGID_BODY_STEPS=10
export MCF_ROOT=/home/liu-group/projects/MolCrystalFlow
export CSP_DIR=/home/liu-group/projects/MolCrystalFlow/csp-pipeline
export MOLFLOW_CSP_DIR=/home/liu-group/projects/MolCrystalFlow/csp-pipeline
python -m pip install -r requirements-potential.txt
```

`requirements-potential.txt` installs `fairchem-core`. UMA model loading may
also require whatever model-access credentials the lab uses for fairchem/UMA
pretrained models, such as a Hugging Face token or fairchem cache that has
already accepted the model terms.

The rigid-body optimizer is not reimplemented in this backend. The backend
searches for known optimizer function names in `csp-pipeline`. If health reports
that rigid-body optimization is unavailable, set `MOLFLOW_RIGID_BODY_FACTORY`
to the existing function:

```bash
export MOLFLOW_RIGID_BODY_FACTORY=package.module:optimize_rigid_body
```

Do not point this at a new optimizer. It should be the rigid-body optimization
implementation already present in the lab `csp-pipeline` folder.

Returned candidate metadata includes `rank`, `energy`, `energyUnits`,
`optimized`, `optimizationType`, `optimizationSteps`, `potentialProvider`,
`potentialModel`, and `scoringError` if ranking could not run.

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
