# MolCrystalFlow Demo

MolCrystalFlow Demo is a frontend for accepting molecular conformer input,
submitting it to the lab MolFlow backend, and previewing generated crystal
structure candidates.

The current app supports the lab desktop backend:

- molecular input is normalized into a shared submission contract before it reaches the API layer
- job submission is proxied through Next.js API routes so backend tokens stay server-side
- generated artifacts are loaded from the backend and previewed in the browser
- pre- and post-optimization geometry/clash screening is reported from backend candidate metadata
- UMA-s-1p2/OMC energy ranking is displayed when the backend reports it is available

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

The frontend expects `.env.local` to contain:

```bash
DESKTOP_BACKEND_URL=https://api.molcrystalflow.org
DESKTOP_BACKEND_TOKEN=<same value as MOLFLOW_API_TOKEN on the lab backend>
NEXT_PUBLIC_DAILY_FREE_GENERATION_LIMIT=20
NEXT_PUBLIC_GENERATION_PROMO_CODE=Qetu123!
NEXT_PUBLIC_SITE_URL=https://www.molcrystalflow.org
```

The public Cloudflare Tunnel hostname is stable, so local development does not
depend on the lab computer's changing private IP address.

## Build

```bash
npm run validate:demo
npm run typecheck
npm run build
```

The bundled example is neutral cytosine (`C4H5N3O`, 13 explicit atoms) from
PubChem CID 597, conformer `0000025500000001`. The static landing-page gallery
contains candidates that passed the backend's pre-optimization geometry/clash
checks and were ranked by UMA-s-1p2 after ten rigid-body optimization steps.
Passing those automated checks does not establish physical stability or guarantee
that every optimized periodic contact is clash-free. Run
`npm run validate:demo` whenever the example input or gallery artifacts change.

## Project structure

- `app/page.tsx` landing and upload flow
- `app/processing/page.tsx` staged mock workflow
- `app/results/[id]/page.tsx` demo result dashboard
- `app/api/jobs/*` and `app/api/health/route.ts` proxy the lab backend
- `components/` reusable UI and workflow components
- `lib/` typed helpers, input normalization, `.xyz` parsing/serialization, backend response normalization, and viewer helpers
- `data/cytosine-example.json` validated cytosine example and provenance
- `public/demo/` downloadable demo artifacts
- `backend/docs/molflow-backend/` server-copyable FastAPI backend bundle

## Lab Backend

Backend setup and copy-to-server instructions live in
`backend/docs/molflow-backend/README.md`.

Daily lab workflow:

```bash
source ~/miniforge3/etc/profile.d/conda.sh
conda activate molcrystalflow
cd ~/molflow-backend
bash start.sh
```

The packaged backend is configured for UMA-s-1p2 molecular-crystal ranking with
the OMC task after exactly 10 rigid-body optimization steps through the lab
`csp-pipeline` implementation. Final optimized coordinates are screened again
before acceptance. CCDC-v2 inputs use the lab-supplied seven geometric and two
basic descriptor implementation rather than zero-filled placeholders; the
supplied planarity formula remains an explicitly documented approximation. The
frontend does not expose backend tokens to the browser.

## Vercel Deployment

The deployable setup keeps the GPU backend on the Ubuntu lab computer and hosts
only the Next.js web app on Vercel:

```text
Browser -> Vercel Next.js app/API routes -> lab Ubuntu MolFlow backend
```

The lab backend must be reachable from Vercel through a public HTTPS URL,
university reverse proxy, or approved tunnel. A private campus IP such as
`http://10.x.x.x:8000` only works from devices on that network and will not be
reachable by Vercel.

Set these Vercel environment variables:

```bash
DESKTOP_BACKEND_URL=https://api.molcrystalflow.org
DESKTOP_BACKEND_TOKEN=<same value as MOLFLOW_API_TOKEN on the lab backend>
NEXT_PUBLIC_DAILY_FREE_GENERATION_LIMIT=20
NEXT_PUBLIC_GENERATION_PROMO_CODE=Qetu123!
NEXT_PUBLIC_SITE_URL=https://www.molcrystalflow.org
```

Do not prefix `DESKTOP_BACKEND_TOKEN` with `NEXT_PUBLIC_`; it must stay
server-side in Vercel API routes.

Vercel Web Analytics is initialized once in the root application layout. It
does not require an additional environment variable; enable Web Analytics for
the Vercel project and deploy this version to begin collecting page views.

The daily generation limit is intentionally browser-side only. It stores a
per-browser daily counter in `localStorage`, resets on the next calendar day,
and unlocks extra generations for that browser when the promo code matches the
public env value. This is lightweight bot/friction control, not a secure quota.

To keep the backend running during a lab session, use `tmux`:

```bash
tmux new -s molflow
source ~/miniforge3/etc/profile.d/conda.sh
conda activate molcrystalflow
cd ~/molflow-backend
bash start.sh
```

Detach without stopping the backend with `Ctrl+B`, then `D`. Reattach later:

```bash
tmux attach -t molflow
```
