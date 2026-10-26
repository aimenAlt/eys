/**
 * IndexNow on every production deploy, plus honest sitemap <lastmod> dates.
 * Node built-ins only: the deploy job does not run `npm ci`. See docs/indexnow.md.
 *
 *   node scripts/indexnow.mjs prepare   (before deploy, on the built dist/)
 *   node scripts/indexnow.mjs submit    (after deploy)
 *
 * prepare
 *   - Hashes every sitemap URL: title + meta description + canonical + the
 *     <main id="main-content"> region (header, footer, nav and JSON-LD stay out,
 *     so template-wide edits never move a page).
 *   - Diffs against the live manifest (https://www.eyshandyman.com/indexnow-manifest.json).
 *     No live manifest (first run) = every URL counts as added.
 *   - Writes dist/indexnow-manifest.json: { url: { hash, lastmod } }. Unchanged
 *     hash keeps its previous lastmod; added or changed gets the deploy time.
 *   - Rewrites each <lastmod> in dist/sitemap-0.xml from the manifest and sets
 *     the sitemap-index.xml <lastmod> to the newest page lastmod.
 *   - Saves the added + changed + removed URLs for `submit` ($RUNNER_TEMP).
 *   If prepare fails, the build-time sitemap stamps ship unchanged and nothing
 *   is submitted (the workflow step is continue-on-error).
 *
 * submit
 *   - Waits until the key file is live, then POSTs the saved URLs to
 *     api.indexnow.org in batches of 10,000. 200/202 = success; anything else
 *     is logged as a GitHub ::warning:: and never fails the deploy.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { extractMain, shortHash } from './lib/page-content.mjs';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.eyshandyman.com';
const HOST = 'www.eyshandyman.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MANIFEST_NAME = 'indexnow-manifest.json';
const LIST_PATH = join(process.env.RUNNER_TEMP || tmpdir(), 'indexnow-urls.json');
const BATCH = 10_000;

/** The key is the name (and content) of the one 32-hex .txt file in public/. */
async function readKey() {
  const names = (await readdir(join(ROOT, 'public'))).filter((n) => /^[0-9a-f]{32}\.txt$/.test(n));
  if (names.length !== 1) throw new Error(`expected exactly one IndexNow key file in public/, found ${names.length}`);
  const key = (await readFile(join(ROOT, 'public', names[0]), 'utf8')).trim();
  if (`${key}.txt` !== names[0]) throw new Error(`key file ${names[0]} does not contain its own key`);
  return key;
}

function summary(lines) {
  const text = lines.join('\n') + '\n';
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) return writeFile(process.env.GITHUB_STEP_SUMMARY, text, { flag: 'a' });
}

function metaContent(html, name) {
  const tag = (html.match(/<meta\b[^>]*>/gi) ?? []).find((t) => new RegExp(`\\sname\\s*=\\s*"${name}"`, 'i').test(t));
  return tag?.match(/\scontent\s*=\s*"([^"]*)"/i)?.[1] ?? '';
}

function pageHash(html) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]*)"/i)?.[1] ?? '';
  return shortHash([title, metaContent(html, 'description'), canonical, extractMain(html) ?? ''].join('\n'));
}

function distFile(url) {
  const path = new URL(url).pathname;
  return join(DIST, path, path.endsWith('/') ? 'index.html' : '');
}

/** Previous manifest from the live site. null = genuinely absent (first run); throws on anything else. */
async function fetchLiveManifest() {
  // Local dry runs only: INDEXNOW_PREVIOUS_MANIFEST=<file> stands in for the live manifest.
  if (process.env.INDEXNOW_PREVIOUS_MANIFEST) return JSON.parse(await readFile(process.env.INDEXNOW_PREVIOUS_MANIFEST, 'utf8'));
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(`${SITE}/${MANIFEST_NAME}?cb=${Date.now()}`, { headers: { 'cache-control': 'no-cache' } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || typeof data.urls !== 'object') throw new Error('manifest has no "urls" object');
      return data;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`could not read the live manifest: ${lastError?.message}`);
}

async function prepare() {
  const deployTime = new Date().toISOString();
  const sitemapPath = join(DIST, 'sitemap-0.xml');
  const sitemap = await readFile(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) throw new Error('dist/sitemap-0.xml lists no URLs');

  const previous = await fetchLiveManifest();
  const prevUrls = previous?.urls ?? {};
  const manifest = { generatedAt: deployTime, urls: {} };
  const added = [];
  const changed = [];

  for (const url of urls) {
    const hash = pageHash(await readFile(distFile(url), 'utf8'));
    const prev = prevUrls[url];
    if (!prev) added.push(url);
    else if (prev.hash !== hash) changed.push(url);
    const keep = prev && prev.hash === hash && prev.lastmod;
    manifest.urls[url] = { hash, lastmod: keep ? prev.lastmod : deployTime };
  }
  const removed = Object.keys(prevUrls).filter((url) => !(url in manifest.urls));

  // Honest <lastmod>: each page's date moves only when its own content does.
  const rewritten = sitemap.replace(/<url><loc>([^<]+)<\/loc><lastmod>[^<]*<\/lastmod>/g, (whole, loc) => {
    const entry = manifest.urls[loc.trim()];
    return entry ? `<url><loc>${loc}</loc><lastmod>${entry.lastmod}</lastmod>` : whole;
  });
  const newest = Object.values(manifest.urls).map((e) => e.lastmod).sort().at(-1);
  const indexPath = join(DIST, 'sitemap-index.xml');
  const index = (await readFile(indexPath, 'utf8')).replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${newest}</lastmod>`);

  const submitList = [...added, ...changed, ...removed];
  await writeFile(join(DIST, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(sitemapPath, rewritten);
  await writeFile(indexPath, index);
  await writeFile(LIST_PATH, JSON.stringify(submitList));

  await summary([
    '### IndexNow prepare',
    previous ? '- Compared against the live manifest.' : '- No live manifest yet (first run): every sitemap URL is submitted once.',
    `- ${urls.length} sitemap URLs: ${added.length} added, ${changed.length} changed, ${removed.length} removed, ${urls.length - added.length - changed.length} unchanged.`,
    `- Newest sitemap lastmod: ${newest}`,
    ...[...added.map((u) => `  - added ${u}`), ...changed.map((u) => `  - changed ${u}`), ...removed.map((u) => `  - removed ${u}`)].slice(0, 120),
  ]);
}

async function submit() {
  let urlList;
  try {
    urlList = JSON.parse(await readFile(LIST_PATH, 'utf8'));
  } catch {
    await summary(['### IndexNow', '- No URL list from prepare (it failed or did not run); nothing submitted.']);
    return;
  }
  if (urlList.length === 0) {
    await summary(['### IndexNow', '- 0 URLs: no page content changed, nothing submitted.']);
    return;
  }

  const key = await readKey();
  const keyLocation = `${SITE}/${key}.txt`;
  let keyLive = false;
  for (let attempt = 1; attempt <= 18 && !keyLive; attempt += 1) {
    try {
      const res = await fetch(`${keyLocation}?cb=${Date.now()}`);
      keyLive = res.status === 200 && (await res.text()).trim() === key;
    } catch {
      keyLive = false;
    }
    if (!keyLive) await new Promise((r) => setTimeout(r, 10_000));
  }
  if (!keyLive) {
    console.log(`::warning::IndexNow key file ${keyLocation} not live after 3 minutes; ${urlList.length} URLs not submitted.`);
    await summary(['### IndexNow', `- Key file not live; ${urlList.length} URLs not submitted.`]);
    return;
  }

  const lines = ['### IndexNow'];
  for (let i = 0; i < urlList.length; i += BATCH) {
    const batch = urlList.slice(i, i + BATCH);
    let status = 'network error';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key, keyLocation, urlList: batch }),
      });
      status = res.status;
    } catch (err) {
      status = `network error: ${err.message}`;
    }
    const ok = status === 200 || status === 202;
    if (!ok) console.log(`::warning::IndexNow returned ${status} for ${batch.length} URLs.`);
    lines.push(`- ${ok ? 'OK' : 'Warning'}: HTTP ${status} for ${batch.length} URLs`);
  }
  await summary(lines);
}

const command = process.argv[2];
if (command === 'prepare') await prepare();
else if (command === 'submit') await submit();
else {
  console.error('usage: node scripts/indexnow.mjs prepare|submit');
  process.exit(2);
}
