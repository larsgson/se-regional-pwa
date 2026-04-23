# bw-pwa

A SvelteKit PWA that reads frozen-Proskomma (`.pkf`) Scripture content
fetched from [scriptureearth.org](https://scriptureearth.org), with
region → language → book → chapter navigation and per-language fonts and
styling. Audio, video, and inline illustrations are referenced directly
from Scripture Earth — no media is stored in this repo.

The current data set is the ~139 Mexican-language deployments on Scripture
Earth, subdivided by language family via `config/regions.conf`.

## Prerequisites

- **Node.js** ≥ 20 (for SvelteKit and the `.mjs` scripts)
- **Python** ≥ 3.10 (stdlib-only; no pip install required)
- Internet access to `scriptureearth.org` during setup

## First-time setup

Clone, then from the repo root:

```bash
# 1. Install JS dependencies
npm install

# 2. Download pkfs + catalogs + per-language stylesheets + fonts
#    (--country MX pulls every Mexican-language SAB deployment;
#     about 139 languages, ~400 MB before dedup.)
python3 scripts/fetch_pkf.py --country MX --workers 8

# 3. Consolidate duplicated fonts into a shared pool and emit each
#    language's tiny delta.css (~400–2800 B per language)
python3 scripts/dedupe_assets.py

# 4. (Optional) Map inline figure filenames to their hashed Scripture
#    Earth URLs — only a couple of Mexican languages have figures
node scripts/map_figures.mjs

# 5. (Optional) Extract per-chapter audio and video manifests from each
#    deployment's JS bundle (~100 languages have video, ~90 have audio)
node scripts/map_media.mjs

# 6. Expose the fetched data under the static/ tree so the PWA can serve it
ln -s ../data/pkf static/pkf

# 7. Start the dev server
npm run dev         # http://localhost:5173
# or build the static site
npm run build && npm run preview
```

Re-running any of the scripts later is safe — they're idempotent. Re-run
`map_figures.mjs` / `map_media.mjs` if Scripture Earth redeploys (they
regenerate the hash-based URL maps).

## Adding more languages / countries

`scripts/fetch_pkf.py` accepts positional ISO codes, a newline-separated
file, or a country code:

```bash
python3 scripts/fetch_pkf.py zai mxt trc nch
python3 scripts/fetch_pkf.py --iso-file lists/extra.txt
python3 scripts/fetch_pkf.py --country GT
```

After any new fetch, re-run `dedupe_assets.py`, optionally `map_figures.mjs`
and `map_media.mjs`, and update `config/regions.conf` so new languages are
assigned to a region (unassigned ones fall into an **Unclassified** bucket
in the UI automatically).

## Project layout

```
config/                        Human-edited configuration
  regions.conf                 Region → ISO-code layout, Mexico-only in UI
  figure_captions.json         Per-language figure-caption display mode
scripts/                       One-shot fetch / transform scripts
  fetch_pkf.py                 Scrape .pkf + catalog + CSS + fonts from SE
  dedupe_assets.py             Consolidate fonts + emit per-iso delta.css
  map_figures.mjs              Map \fig filenames to hashed SE image URLs
  map_media.mjs                Extract per-chapter audio + video manifest
  probe_*.mjs                  Development probes (kept for reference)
src/                           SvelteKit app
  lib/data/                    Region parsing, info.json loader, caption-mode config
  lib/reader/                  Proskomma thaw, Sofria render, Reader component
  routes/                      /, /r/[region], /r/[region]/[iso]
  app.html, app.css, app.d.ts
static/
  manifest.webmanifest         PWA manifest
  pkf/                         Symlink to ../data/pkf (not in git)
data/                          Generated; not in git
  pkf/<iso>/                   Per-language pkf, catalog, info.json, styles/
  pkf/_fonts/                  Shared font pool (32 unique binaries across Mexico)
  pkf/manifest.json            Summary of fetched languages
  pkf/unclassified.txt         ISOs not in any region in regions.conf
```

## What's *not* in the repo

- `/data` — populated by the scripts above (~170 MB for Mexico)
- `/example` — reference copies of the upstream SAB-PWA project and a
  related Astro wiki, kept locally for study; re-clone from the original
  GitHub sources (`sillsdev/appbuilder-pwa`, `larsgson/bibel-wiki`) if
  you want them back
- `/node_modules`, `/.svelte-kit`, `/build` — build artefacts
- `/.claude`, `/.vscode`, `/.idea` — per-user editor / tooling state

## Data sources and remote dependencies

All scripture content, fonts, illustrations, audio, and video are fetched
from or referenced at Scripture Earth
(`https://scriptureearth.org/data/<iso>/sab/<iso>/`). The PWA loads:

- `.pkf` archives → thawed into a browser-side Proskomma instance
- catalog JSON → book list + per-chapter verse numbering
- `styles/delta.css` → per-language `@font-face` declarations + scoped
  container rule
- Fonts from the shared pool (`static/pkf/_fonts/`)
- Figure images directly from Scripture Earth (cross-origin `<img>`)
- Audio MP3s directly from Scripture Earth
  (`https://www.scriptureearth.org/data/<iso>/audio/<file>.mp3`)
- Videos: YouTube / ArcLight-Jesus-Film iframes, HLS via `hls.js` (lazy
  chunk, loads on first HLS click), direct `.mp4` via `<video>`

Licensing: each language's scripture content has its own rights holder
(typically SIL or the translation team). Respect their terms if you
redistribute.

## Development scripts

- `npm run dev` — dev server with HMR
- `npm run build` — static build to `build/` via `@sveltejs/adapter-static`
- `npm run preview` — serve the built output
- `npm run check` — `svelte-check` + TypeScript

## Deployment

The build is a **purely static site**: `build/` contains plain HTML, CSS,
and JS files — no Node server is needed to run it. You can drop the
contents of `build/` (plus `data/pkf/` at the URL path `/pkf/`, since
that's what `static/pkf` symlinks to) onto any static host — GitHub
Pages, Netlify, Cloudflare Pages, S3 + CloudFront, an nginx container,
etc.

Every route is pre-rendered at build time: the region list, the 10
region pages, and the 139 per-ISO pages (150 HTML files in total). On
first visit the browser downloads:

- the pre-rendered HTML for the current route (~10 KB)
- shared framework + router chunks (~60–80 KB gzipped total)
- the current ISO's `info.json` chunk, lazy-loaded (~20–30 KB gzipped)
- `proskomma-core` (~150–250 KB gzipped, only when opening an ISO page)
- `hls.js` (~160 KB gzipped, only on first HLS video click)

Time-to-first-paint on a mid-tier phone on 3G: ~200–400 ms. Time-to-see
scripture text: ~1–2 s (dominated by the pkf thaw).

## Known limits

- **zpl figure placeholders** — zpl's source USFM has 2 `\fig` markers in
  Acts that reference a Classical Bible Illustrations plate
  (`CN01953B.TIF`) which was never uploaded to Scripture Earth. The
  reader correctly shows `[image: CN01953B.TIF]` because the image
  genuinely doesn't exist in zpl's deployment — this is a source-data
  gap, not a mapping we can fix. The `V2022…jpg` images on SE's zpl
  deployment are unrelated: they're YouTube-video thumbnails for the 43
  Juan clips, placed via the media manifest (which works).
- **Figure captions** are `hide` by default (see `config/figure_captions.json`)
  because illustration packs often ship English stock text even in
  minority-language Bibles; per-language opt-in via `heuristic` or `show`.
