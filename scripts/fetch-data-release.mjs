#!/usr/bin/env node
/**
 * Prebuild hook: pull the `data/pkf/` tree from a GitHub Release asset
 * published by the separate (private) `se-regional-data` repo.
 *
 * Env:
 *   DATA_REPO           "<owner>/<repo>" of the data repo. Required unless skipping.
 *   GITHUB_TOKEN        PAT or Actions token with read access. Required for private repos.
 *   DATA_RELEASE_TAG    Release tag to fetch. Defaults to "latest".
 *   SKIP_DATA_FETCH     If "1", do nothing (local dev shortcut when data already present).
 *
 * Behaviour:
 *   - If SKIP_DATA_FETCH=1 → exit 0 silently.
 *   - If DATA_REPO or GITHUB_TOKEN missing but local `data/pkf/manifest.json`
 *     exists → warn and exit 0 (local dev without configuring CI secrets).
 *   - If config missing and no local data → exit 1.
 *   - If remote tag matches the tag recorded at `data/pkf/.fetched-tag` → skip.
 *   - Otherwise download the `pkf-*.tar.zst` asset, extract to `data/.pkf-new/`,
 *     atomically swap with `data/pkf/`, recreate `static/pkf` symlink.
 *
 * Requires the `tar` binary to support `--zstd` (GNU tar >=1.31, bsdtar w/ libzstd).
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
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
const REPO = process.env.DATA_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const TARGET_TAG = process.env.DATA_RELEASE_TAG || 'latest';

function log(msg) {
    console.log(`[fetch-data-release] ${msg}`);
}
function warn(msg) {
    console.warn(`[fetch-data-release] ${msg}`);
}
function die(msg, code = 1) {
    console.error(`[fetch-data-release] ${msg}`);
    process.exit(code);
}

if (SKIP) {
    log('SKIP_DATA_FETCH=1 — skipping.');
    process.exit(0);
}

if (!REPO || !TOKEN) {
    if (existsSync(join(PKF_DIR, 'manifest.json'))) {
        warn('DATA_REPO or GITHUB_TOKEN not set. Using existing local data/pkf/.');
        process.exit(0);
    }
    die('DATA_REPO and GITHUB_TOKEN are required (or set SKIP_DATA_FETCH=1). No local data found.');
}

const api = `https://api.github.com/repos/${REPO}`;
const ghHeaders = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'se-regional-pwa/fetch-data-release'
};

async function getRelease() {
    const url = TARGET_TAG === 'latest'
        ? `${api}/releases/latest`
        : `${api}/releases/tags/${encodeURIComponent(TARGET_TAG)}`;
    const res = await fetch(url, { headers: ghHeaders });
    if (!res.ok) die(`Release lookup failed (${res.status}): ${await res.text()}`);
    return res.json();
}

async function downloadAsset(assetId, destPath) {
    const res = await fetch(`${api}/releases/assets/${assetId}`, {
        headers: { ...ghHeaders, Accept: 'application/octet-stream' },
        redirect: 'follow'
    });
    if (!res.ok || !res.body) die(`Asset download failed (${res.status}): ${await res.text()}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(destPath));
}

function extractTarZst(tarPath, destDir) {
    mkdirSync(destDir, { recursive: true });
    const r = spawnSync('tar', ['--zstd', '-xf', tarPath, '-C', destDir], { stdio: 'inherit' });
    if (r.status !== 0) {
        die('tar --zstd extraction failed. Your tar binary must support zstd (GNU tar >=1.31 or bsdtar w/ libzstd).');
    }
}

function recreateSymlink() {
    try { unlinkSync(STATIC_PKF); } catch { /* not present, fine */ }
    mkdirSync(dirname(STATIC_PKF), { recursive: true });
    // Symlink is relative, matching the existing convention (`../data/pkf`).
    symlinkSync('../data/pkf', STATIC_PKF);
}

(async () => {
    const release = await getRelease();
    const remoteTag = release.tag_name;
    if (!remoteTag) die('Release response missing tag_name.');

    const localTag = existsSync(TAG_FILE) ? readFileSync(TAG_FILE, 'utf8').trim() : null;
    if (localTag === remoteTag && existsSync(join(PKF_DIR, 'manifest.json'))) {
        log(`Local data already at ${remoteTag} — skipping download.`);
        // Still ensure symlink exists.
        if (!existsSync(STATIC_PKF)) recreateSymlink();
        return;
    }

    const assets = release.assets ?? [];
    const tarAsset = assets.find((a) => /^pkf-.*\.tar\.zst$/.test(a.name));
    if (!tarAsset) die(`No "pkf-*.tar.zst" asset found on release ${remoteTag}.`);

    mkdirSync(DATA_DIR, { recursive: true });
    const tmpTar = join(DATA_DIR, '.pkf-download.tar.zst');
    const stagingDir = join(DATA_DIR, '.pkf-new');

    log(`Downloading ${tarAsset.name} (${(tarAsset.size / 1048576).toFixed(1)} MB) from release ${remoteTag}...`);
    await downloadAsset(tarAsset.id, tmpTar);

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

    writeFileSync(TAG_FILE, remoteTag + '\n');
    recreateSymlink();

    log(`Data updated to ${remoteTag}.`);
})().catch((err) => die(err.stack || String(err)));
