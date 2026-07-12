/**
 * Full-site Playwright screenshot capture.
 * Discovers every URL from dist/sitemap-0.xml (run build first).
 *
 * Usage:
 *   BASE_URL=http://localhost:4321 node scripts/screenshot.mjs
 *   PAGES=/,/services/,/contact/ node scripts/screenshot.mjs   # optional filter
 */
import { chromium } from 'playwright';
import { mkdir, readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = join(import.meta.dirname, '../.screenshots');
const SITEMAP = join(import.meta.dirname, '../dist/sitemap-0.xml');
const SITE = 'https://www.eyshandyman.com';

const viewports = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
];

function pathToName(pathname) {
  if (pathname === '/' || pathname === '') return 'home';
  return pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120);
}

async function loadSitemapPaths() {
  await access(SITEMAP);
  const xml = await readFile(SITEMAP, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return locs.map((loc) => {
    const u = new URL(loc);
    return u.pathname.endsWith('/') || u.pathname.includes('.') ? u.pathname : `${u.pathname}/`;
  });
}

function applyFilter(paths) {
  const raw = process.env.PAGES?.trim();
  if (!raw) return paths;
  const wanted = raw.split(',').map((p) => {
    let s = p.trim();
    if (!s.startsWith('/')) s = `/${s}`;
    if (!s.endsWith('/') && !s.includes('.')) s = `${s}/`;
    return s === '//' ? '/' : s;
  });
  return paths.filter((p) => wanted.includes(p));
}

const paths = applyFilter(await loadSitemapPaths());
// Always include 404 for layout QA
if (!process.env.PAGES && !paths.includes('/404.html')) {
  paths.push('/404.html');
}

console.log(`Capturing ${paths.length} pages × ${viewports.length} viewports → ${OUT}`);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
let ok = 0;
let fail = 0;

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  for (const pathname of paths) {
    const url = `${BASE}${pathname === '/404.html' ? '/404.html' : pathname}`;
    const name = pathToName(pathname === '/404.html' ? '/404' : pathname);
    const file = join(OUT, `${name}-${vp.label}.png`);
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      if (!res || (res.status() >= 400 && pathname !== '/404.html')) {
        console.error(`FAIL ${pathname} (${vp.label}): HTTP ${res?.status()}`);
        fail++;
        continue;
      }
      await page.screenshot({ path: file, fullPage: true });
      console.log(`OK ${name}-${vp.label}.png`);
      ok++;
    } catch (err) {
      console.error(`FAIL ${pathname} (${vp.label}):`, err.message);
      fail++;
    }
  }
  await context.close();
}

await browser.close();
console.log(`Done. ok=${ok} fail=${fail} (expected ~${paths.length * viewports.length})`);
if (fail > 0) process.exitCode = 1;
