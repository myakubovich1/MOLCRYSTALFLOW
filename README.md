# MolCrystalFlow Demo

MolCrystalFlow Demo is a frontend-first research prototype for uploading a single molecular conformer in `.xyz` format and previewing generated crystal structure candidates in demo mode.

The current app is intentionally mock-first:

- `.xyz` upload is validated and lightly parsed for atom count and molecular formula
- job submission flows through a local mock API route
- processing is staged in the UI to resemble a future compute workflow
- results and downloadable artifacts are precomputed demo assets
- no SSH, Slurm, HiPerGator, or scientific backend is contacted in version 1

## Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run typecheck
npm run build
```

## Project structure

- `app/page.tsx` landing and upload flow
- `app/processing/page.tsx` staged mock workflow
- `app/results/[id]/page.tsx` demo result dashboard
- `app/api/mock-submit/route.ts` mock submission and retrieval route
- `components/` reusable UI and workflow components
- `lib/` typed helpers, `.xyz` parsing, demo result generation, cookie-backed mock session storage
- `data/demo-result.json` static mock result template
- `public/demo/` downloadable demo artifacts

## Future backend handoff

The app is organized so the mock route can later be replaced by a real submission layer that:

- uploads the `.xyz` conformer to a lab workstation or HPC entrypoint
- creates and tracks a queued generation job
- polls status until outputs are ready
- returns real candidate files and metadata

The UI copy already reflects the current scientific scope: generated candidate structures in research preview mode, not experimentally validated final crystal predictions.
