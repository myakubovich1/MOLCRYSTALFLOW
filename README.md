# MolCrystalFlow Demo

MolCrystalFlow Demo is a frontend-first research prototype for accepting molecular conformer input and previewing generated crystal structure candidates in demo mode.

The current app is intentionally mock-first:

- molecular input is normalized into a shared submission contract before it reaches the API layer
- the current checked-in UI submits through the `.xyz` upload path, and the same normalization layer supports pasted XYZ and manual atom rows for future UI wiring
- job submission flows through a local mock API route that now consumes one normalized payload shape
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
- `lib/` typed helpers, input normalization, `.xyz` parsing/serialization, mock submission adapter, demo result generation, cookie-backed mock session storage
- `data/demo-result.json` static mock result template
- `public/demo/` downloadable demo artifacts

## Future backend handoff

The app is organized so the mock route can later be replaced by a real submission layer that:

- receives a normalized molecular submission payload from any input mode
- uploads the canonical XYZ payload to a lab workstation or HPC entrypoint
- creates and tracks a queued generation job
- polls status until outputs are ready
- returns real candidate files and metadata

The UI copy already reflects the current scientific scope: generated candidate structures in research preview mode, not experimentally validated final crystal predictions.
