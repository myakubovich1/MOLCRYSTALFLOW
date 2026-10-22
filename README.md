# MolCrystalFlow

MolCrystalFlow is a web interface for generating molecular crystal packing
candidates from an XYZ conformer. It submits jobs to a GPU backend and provides
interactive structure inspection, screening summaries, energy rankings, and
downloadable results.

This repository contains the web application, its API proxy routes, and the
packaged FastAPI backend. The scientific model is maintained in the
[Liu Group MolCrystalFlow repository](https://github.com/Liu-Group-UF/MolCrystalFlow).

## Features

- Upload an XYZ file, paste coordinates, or load the cytosine example.
- Select Z values (molecules per unit cell) and the number of samples per Z.
  Available Z values are reported by the connected backend.
- Follow job status and inspect geometry-screening and energy-ranking results
  when supplied by the backend.
- Explore candidates in an interactive 3D viewer and measure Cartesian and
  nearest-periodic-image distances when lattice vectors are available.
- Download accepted structures individually, grouped by Z, as a combined XYZ
  file, or as a ZIP of individual files.
- Save references to completed runs in the current browser.

Saved runs are browser-local bookmarks. Removing a saved entry does not delete
the corresponding files from the backend.

## Local development

Requires Node.js 20.10 or later and npm. Live generation also requires a
configured, reachable backend with its model dependencies and GPU environment.

Install the frontend dependencies:

```bash
npm ci
```

Create `.env.local` in the repository root:

```dotenv
DESKTOP_BACKEND_URL=http://127.0.0.1:8000
DESKTOP_BACKEND_TOKEN=replace-with-your-backend-token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Replace the backend URL with the address reachable from the Next.js server.
The token must match `MOLFLOW_API_TOKEN` in the backend environment.

Start the development server:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). The bundled gallery can be inspected
without submitting a job; new generation requests require the backend.

## Backend and deployment

The Next.js API routes forward job submission, status, and artifact requests to
the FastAPI service. Generation and energy ranking run on the backend, not in
the browser or the Next.js process.

See the [backend README](backend/docs/molflow-backend/README.md) for the Python
environment, model configuration, GPU requirements, and startup instructions.
The [inference-kit notes](csp_inference_kit/README.md) describe conformer
preprocessing and descriptor assumptions.

For a hosted frontend, configure the same environment variables on the hosting
platform and use a backend URL reachable from that server over HTTPS. Keep
`DESKTOP_BACKEND_TOKEN` server-side; never give it a `NEXT_PUBLIC_` prefix.

The optional `NEXT_PUBLIC_DAILY_FREE_GENERATION_LIMIT` and
`NEXT_PUBLIC_GENERATION_PROMO_CODE` settings control a browser-local counter and
its unlock code. These values are public client configuration, not credentials
or enforceable server-side quotas. The backend token authenticates the proxy;
the application routes do not implement user authentication or per-job ownership
checks. Deployments must provide appropriate access controls before exposing
compute or private results to untrusted users.

## Scientific scope

The supplied backend configuration uses CCDC-v2 generation, the lab inference
kit's seven geometric and two basic descriptors, geometry and periodic-clash
screening, and UMA-s-1p2 ranking with the OMC task after ten rigid-body
optimization steps. Actual capabilities depend on the running backend's
configuration.

Generated structures are candidates for further investigation. Passing automated
filters or receiving a low model energy does not establish physical stability,
experimental realizability, or exhaustive crystal-structure prediction.

Current limitations include:

- The inference kit's planarity descriptor is an approximation rather than an
  exact reproduction of the training descriptor.
- For Z greater than one, the configured workflow uses the same parity state
  for each molecular copy; mirrored alternatives are not automatically enumerated.
- The XYZ interface does not collect charge or spin. The UMA-OMC path uses the
  backend's neutral, spin-zero convention.

## Reference example

The bundled molecular input is neutral cytosine (`C4H5N3O`, 13 explicit atoms),
from PubChem CID 597, conformer `0000025500000001`. Coordinates, bonding, and
provenance are recorded in [data/cytosine-example.json](data/cytosine-example.json).

The static gallery contains precomputed Z=2 candidates that passed
pre-optimization geometry and clash checks and were ranked by UMA-s-1p2 after
ten rigid-body optimization steps. Those checks do not guarantee that every
optimized periodic contact is clash-free.

See [public/demo/README.md](public/demo/README.md) for the reference artifacts.

## Validation and production build

```bash
npm run validate:demo
npm run typecheck
npm run build
```

These commands check the bundled reference data, TypeScript types, and production
compilation. They do not test a live GPU generation run.

After building, start the production server with `npm start`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Generation workspace and reference gallery |
| `app/results/[id]/page.tsx` | Results for a backend job |
| `app/processing/page.tsx` | Redirect to the job's results page |
| `app/api/` | Backend health, submission, status, and file proxies |
| `components/` | Generation controls, result panels, and 3D viewers |
| `lib/` | Input handling, backend response parsing, XYZ utilities, and measurements |
| `data/` and `public/demo/` | Cytosine provenance and reference structures |
| `backend/docs/molflow-backend/` | FastAPI backend source, runtime, and deployment instructions |
| `csp_inference_kit/` | Lab conformer-preprocessing utilities and documentation |

The web application uses Next.js App Router, React, TypeScript, Tailwind CSS, and
3Dmol.js.
