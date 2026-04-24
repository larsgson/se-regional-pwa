#!/usr/bin/env node
/**
 * Prebuild hook: pull the scripture data (pkf + catalogs + fonts + styles)
 * from the public `se-regional-data` repo's GitHub Release.
 *
 * Contract: a stable `index.json` alias at
 *     https://github.com/<DATA_REPO>/releases/latest/download/index.json
 * tells us the tag and asset filenames for this release. See the data
 * repo's README for the full contract.
 *
 * Env:
 *   DATA_REPO          "<owner>/<repo>" (default "larsgson/se-regional-data").
 *   DATA_RELEASE_TAG   Pin a specific tag (e.g. "data-2026.04.23"). Defaults
 *                      to "latest", which resolves via the stable alias.
 *   SKIP_DATA_FETCH    If "1", do nothing (local dev shortcut).
 *   GITHUB_TOKEN       Optional — only improves rate-limit headroom. The
 *                      repo is public; anonymous read is enough.
 *
 * Behaviour:
 *   - SKIP_DATA_FETCH=1               → exit 0 silently.
 *   - Tag already cached locally      → exit 0, ensure symlink exists.
 *   - Otherwise download, verify      → atomic-swap into data/pkf/.
 *
 * Requires the `tar` binary to support `--zstd` (GNU tar >=1.31, bsdtar
 * w/ libzstd — both ship on Ubuntu and recent macOS by default).
 */
import { createHash } from 'node:crypto';
import {
    createWriteStream,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    renameSync,
    symlinkSync,
    unlinkSync,
    writeFileSync
} from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const PKF_DIR = join(DATA_DIR, 'pkf');
const STATIC_PKF = join(ROOT, 'static', 'pkf');
const TAG_FILE = join(PKF_DIR, '.fetched-tag');

const SKIP = process.env.SKIP_DATA_FETCH === '1';
const REPO = process.env.DATA_REPO || 'larsgson/se-regional-data';
const TAG = process.env.DATA_RELEASE_TAG || 'latest';
const TOKEN = process.env.GITHUB_TOKEN;

const log = (m) => console.log(`[fetch-data] ${m}`);
const warn = (m) => console.warn(`[fetch-data] ${m}`);
const die = (m, code = 1) => {
    console.error(`[fetch-data] ${m}`);
    process.exit(code);
};

if (SKIP) {
    log('SKIP_DATA_FETCH=1 — skipping.');
    process.exit(0);
}

const authHeader = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

async function fetchJson(url) {
    const r = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'se-regional-pwa', ...authHeader }
    });
    if (!r.ok) die(`GET ${url} — HTTP ${r.status}: ${await r.text()}`);
    return r.json();
}

async function download(url, destPath) {
    const r = await fetch(url, {
        headers: { 'User-Agent': 'se-regional-pwa', ...authHeader }
    });
    if (!r.ok || !r.body) die(`GET ${url} — HTTP ${r.status}: ${await r.text()}`);
    await pipeline(Readable.fromWeb(r.body), createWriteStream(destPath));
}

function sha256File(path) {
    const hash = createHash('sha256');
    hash.update(readFileSync(path));
    return hash.digest('hex');
}

function extractTarZst(tarPath, destDir) {
    mkdirSync(destDir, { recursive: true });
    const r = spawnSync('tar', ['--zstd', '-xf', tarPath, '-C', destDir], { stdio: 'inherit' });
    if (r.status !== 0) {
        die('tar --zstd extraction failed. Your tar must support zstd (GNU tar >=1.31 or bsdtar w/ libzstd).');
    }
}

function recreateSymlink() {
    try { unlinkSync(STATIC_PKF); } catch { /* not present, fine */ }
    mkdirSync(dirname(STATIC_PKF), { recursive: true });
    symlinkSync('../data/pkf', STATIC_PKF);
}

(async () => {
    const indexUrl =
        TAG === 'latest'
            ? `https://github.com/${REPO}/releases/latest/download/index.json`
            : `https://github.com/${REPO}/releases/download/${encodeURIComponent(TAG)}/index.json`;
    const index = await fetchJson(indexUrl);
    if (!index.tag || !index.asset || !index.sha256) {
        die(`index.json is missing required fields (tag/asset/sha256): ${JSON.stringify(index)}`);
    }

    const cachedTag = existsSync(TAG_FILE) ? readFileSync(TAG_FILE, 'utf8').trim() : null;
    if (cachedTag === index.tag && existsSync(join(PKF_DIR, 'manifest.json'))) {
        log(`Local data already at ${index.tag} — skipping download.`);
        if (!existsSync(STATIC_PKF)) recreateSymlink();
        return;
    }

    log(
        `Pulling release ${index.tag} — ${index.summary?.languages ?? '?'} langs, ${(index.bytes / 1048576).toFixed(1)} MiB`
    );

    mkdirSync(DATA_DIR, { recursive: true });
    const tmpTar = join(DATA_DIR, '.pkf-download.tar.zst');
    const stagingDir = join(DATA_DIR, '.pkf-new');
    const dl = (name) =>
        download(`https://github.com/${REPO}/releases/download/${index.tag}/${name}`, join(DATA_DIR, name));

    await download(
        `https://github.com/${REPO}/releases/download/${index.tag}/${index.asset}`,
        tmpTar
    );
    const got = sha256File(tmpTar);
    if (got !== index.sha256) {
        try { rmSync(tmpTar); } catch { /* noop */ }
        die(`sha256 mismatch: got ${got}, expected ${index.sha256}`);
    }
    log(`sha256 verified (${got.slice(0, 12)}…)`);

    // Pull sibling assets for auditability; they also live inside the tarball.
    if (index.manifest_asset) await dl(index.manifest_asset);
    if (index.licenses_asset) await dl(index.licenses_asset);
    writeFileSync(join(DATA_DIR, 'index.json'), JSON.stringify(index, null, 2));

    log(`Extracting to ${stagingDir}...`);
    try { rmSync(stagingDir, { recursive: true, force: true }); } catch { /* noop */ }
    extractTarZst(tmpTar, stagingDir);

    if (!existsSync(join(stagingDir, 'manifest.json'))) {
        die('Extracted archive does not contain manifest.json — aborting without touching existing data/pkf/.');
    }

    // Atomic swap.
    const oldDir = join(DATA_DIR, '.pkf-old');
    try { rmSync(oldDir, { recursive: true, force: true }); } catch { /* noop */ }
    if (existsSync(PKF_DIR)) renameSync(PKF_DIR, oldDir);
    renameSync(stagingDir, PKF_DIR);
    try { rmSync(oldDir, { recursive: true, force: true }); } catch { /* noop */ }
    try { rmSync(tmpTar); } catch { /* noop */ }

    // The in-tarball manifest.json can lag behind the release's per-iso
    // exclusions (data-repo pack step currently doesn't prune it). The sibling
    // manifest asset advertised via index.json is the authoritative copy —
    // overwrite the extracted one with it so the app sees only the included
    // ISOs.
    if (index.manifest_asset) {
        const siblingManifest = join(DATA_DIR, index.manifest_asset);
        if (existsSync(siblingManifest)) {
            writeFileSync(join(PKF_DIR, 'manifest.json'), readFileSync(siblingManifest));
        }
    }

    writeFileSync(TAG_FILE, index.tag + '\n');
    recreateSymlink();

    log(`Data updated to ${index.tag}.`);
})().catch((err) => die(err.stack || String(err)));
