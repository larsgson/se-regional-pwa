# se-regional-pwa

A SvelteKit PWA that reads frozen-Proskomma (`.pkf`) Scripture content
for the ~139 Mexican-language deployments on
[scriptureearth.org](https://scriptureearth.org), with region → language
→ book → chapter navigation and per-language fonts and styling. Audio,
video, and inline illustrations are referenced directly from Scripture
Earth — no media is stored in this repo.

The **data** (pkf archives, catalogs, fonts, per-language CSS) lives in
a separate repository, `se-regional-data`, and is published there as
GitHub Release tarballs. This repository contains only the app code —
the data is pulled in at build time by `scripts/fetch-data-release.mjs`.

Of the 139 MX ISOs, 134 are redistributable under CC BY-NC-ND 4.0; 5
(`cya`, `top`, `hch`, `poi`, `nlv`) are excluded from the public data
release. Authoritative inventory: `config/licenses.json`.

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm` or `corepack enable`)
- **tar** with zstd support (GNU tar ≥ 1.31 or bsdtar w/ libzstd — both
  Ubuntu and recent macOS ship this by default)

## First-time setup

```bash
pnpm install
pnpm dev
```

The `prebuild` hook (`scripts/fetch-data-release.mjs`) will pull the
latest `se-regional-data` GitHub Release and extract it to `data/pkf/`
on first `pnpm build`. For local dev against data you already have, the
hook skips gracefully — just run `pnpm dev`.

### Build-time environment variables

| Variable | Purpose |
|---|---|
| `DATA_REPO` | `<owner>/<repo>` of the data repo. |
| `GITHUB_TOKEN` | Token with read access to `DATA_REPO` (required if private). |
| `DATA_RELEASE_TAG` | Pin a specific release tag. Defaults to `latest`. |
| `SKIP_DATA_FETCH` | Set to `1` to skip the prebuild fetch entirely (use when you already have `data/pkf/`). |

See `.env.example`.

## Development scripts

- `pnpm dev` — dev server with HMR
- `pnpm build` — static build to `build/` via `@sveltejs/adapter-static`
  (runs `prebuild` first)
- `pnpm preview` — serve the built output
- `pnpm check` — `svelte-check` + TypeScript
- `pnpm test` — `vitest run`
- `pnpm test:watch` — vitest in watch mode

## Project layout

```
config/                        Human-edited configuration
  regions.conf                 Region → ISO-code layout, Mexico-only in UI
  figure_captions.json         Per-language figure-caption display mode
  licenses.json                Per-ISO text-license inventory
scripts/
  fetch-data-release.mjs       Prebuild: pull data/pkf from se-regional-data release
src/                           SvelteKit app
  lib/data/                    Region parsing, info.json loader, caption-mode config
  lib/reader/                  Proskomma thaw, Sofria render, Reader component
  routes/                      /, /r/[region], /r/[region]/[iso]
  app.html, app.css, app.d.ts
static/
  manifest.webmanifest         PWA manifest
  pkf/                         Symlink to ../data/pkf (recreated by fetch-data-release.mjs)
data/                          Populated at build time; not in git
  pkf/<iso>/                   Per-language pkf, catalog, info.json, styles/
  pkf/_fonts/                  Shared font pool (~32 unique binaries across Mexico)
  pkf/manifest.json            Summary of fetched languages
netlify.toml                   Netlify build + cache-plugin config
vitest.config.ts               Test runner (scoped to src/**)
```

## What's *not* in the repo

- `/data` — pulled in by `fetch-data-release.mjs`
- `/node_modules`, `/.svelte-kit`, `/build` — build artefacts
- `/.claude`, `/.vscode`, `/.idea` — per-user editor / tooling state

## Deployment (Netlify)

`netlify.toml` is wired for Netlify out of the box:

- `pnpm build` is the build command; `build/` is the publish directory.
- `netlify-plugin-cache` persists `data/pkf/` between builds so we only
  re-download when the release tag changes.
- Long-cache immutable headers on `/pkf/*` (all hashed filenames).

Set `DATA_REPO` and `GITHUB_TOKEN` in Netlify's *Site settings →
Environment variables*. Optionally pin `DATA_RELEASE_TAG` to a known
release for reproducible builds.

The build is a **purely static site**: `build/` is plain HTML, CSS, and
JS — no Node server is needed to run it. Every route is pre-rendered
at build time (1 root + 10 regions + 139 per-ISO pages = 150 HTML
files). Other static hosts (Cloudflare Pages, S3 + CloudFront, nginx)
work just as well, but you'll need to run `fetch-data-release.mjs` in
their build step or upload `build/` + `data/pkf/` yourself.

On first visit the browser downloads:

- the pre-rendered HTML for the current route (~10 KB)
- shared framework + router chunks (~60–80 KB gzipped total)
- the current ISO's `info.json` chunk, lazy-loaded (~20–30 KB gzipped)
- `proskomma-core` (~150–250 KB gzipped, only when opening an ISO page)
- `hls.js` (~160 KB gzipped, only on first HLS video click)

Time-to-first-paint on a mid-tier phone on 3G: ~200–400 ms. Time-to-see
scripture text: ~1–2 s (dominated by the pkf thaw).

## Data sources and licensing

All scripture content, fonts, illustrations, audio, and video are
fetched from or referenced at Scripture Earth
(`https://scriptureearth.org/data/<iso>/sab/<iso>/`).

Per-ISO licenses are recorded in `config/licenses.json`:

- **134 MX languages**: `CC-BY-NC-ND-4.0` (see
  [creativecommons.org/licenses/by-nc-nd/4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/))
- **5 MX languages** excluded from the public data release:
  - `cya` — "Usado con permiso" (permission-only, not CC)
  - `top` — "Todos los derechos reservados" in the Texto block
  - `hch`, `poi` — bundle Biblica NVI (proprietary)
  - `nlv` — "Texto en proceso de finalizar" (provisional)

The license covers the scripture TEXT (pkf data) only. Images, audio,
and video referenced by SE URL carry their own per-asset licenses
(Jesus Film Project, LUMO, Sweet Publishing, Inspirational Films,
Hosanna, etc.) — most are permission-only or all-rights-reserved.

## Known limits

- **zpl figure placeholders** — zpl's source USFM has 2 `\fig` markers
  in Acts that reference a Classical Bible Illustrations plate
  (`CN01953B.TIF`) which was never uploaded to Scripture Earth. The
  reader silently omits them, matching SE's own graceful fallback.
- **Figure captions** are `hide` by default (see
  `config/figure_captions.json`) because illustration packs often ship
  English stock text even in minority-language Bibles; per-language
  opt-in via `heuristic` or `show`.
