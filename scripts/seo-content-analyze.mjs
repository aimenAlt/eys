/**
 * Content-depth + duplication analysis (read-only).
 * - main-scoped internal link counts (strips <header>/<footer>)
 * - near-duplicate body detection via word-shingles (Jaccard) within page families
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = join(import.meta.dirname, '../dist');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function stripChrome(html) {
  let m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

function textOf(fragment) {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shingles(text, k = 5) {
  const words = text.split(' ').filter(Boolean);
  const set = new Set();
  for (let i = 0; i + k <= words.length; i++) set.add(words.slice(i, i + k).join(' '));
  return set;
}

function jaccard(a, b) {
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

function family(path) {
  if (/^\/services\/[^/]+\/$/.test(path)) {
    const slug = path.split('/').filter(Boolean)[1];
    if (['repairs-and-maintenance', 'installation-and-assembly', 'remodeling-and-upgrades'].includes(slug))
      return 'category';
    return 'service';
  }
  if (/^\/service-areas\/[^/]+\/$/.test(path)) return 'city';
  if (/^\/service-areas\/[^/]+\/[^/]+\/$/.test(path)) return 'community';
  if (/^\/[^/]+\/$/.test(path)) {
    const core = ['about', 'contact', 'book', 'pricing', 'reviews', 'privacy', 'terms', 'services', 'service-areas', 'projects', 'blog', 'sitemap'];
    if (!core.includes(path.replace(/\//g, ''))) return 'legacy-city-service';
  }
  return 'other';
}

const files = await walk(DIST);
const pages = [];
for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
  const path = rel === '/' ? '/' : rel;
  if (path.includes('404')) continue;
  const main = stripChrome(html);
  const bodyLinks = [...main.matchAll(/href="([^"]+)"/gi)]
    .map((m) => m[1])
    .filter((h) => (h.startsWith('/') || h.includes('eyshandyman.com')) && !h.startsWith('//'));
  const text = textOf(main);
  pages.push({ path, family: family(path), bodyLinks: bodyLinks.length, text, sh: shingles(text) });
}

// duplication within families
const byFam = {};
for (const p of pages) (byFam[p.family] ??= []).push(p);

console.log('=== Main-scoped (contextual) internal links, by page ===');
for (const p of [...pages].sort((a, b) => a.bodyLinks - b.bodyLinks)) {
  console.log(`   ${String(p.bodyLinks).padStart(3)}  [${p.family}] ${p.path}`);
}

console.log('\n=== Near-duplicate body pairs (Jaccard >= 0.4) within family ===');
for (const [fam, list] of Object.entries(byFam)) {
  const pairs = [];
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const jac = jaccard(list[i].sh, list[j].sh);
      if (jac >= 0.4) pairs.push([jac, list[i].path, list[j].path]);
    }
  if (pairs.length) {
    console.log(`\n[${fam}] ${pairs.length} similar pairs`);
    for (const [jac, a, b] of pairs.sort((x, y) => y[0] - x[0]).slice(0, 15))
      console.log(`   ${(jac * 100).toFixed(0)}%  ${a}  <->  ${b}`);
  }
}

console.log('\n=== Avg body-shingle overlap per family (mean Jaccard of all pairs) ===');
for (const [fam, list] of Object.entries(byFam)) {
  if (list.length < 2) continue;
  let sum = 0, n = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      sum += jaccard(list[i].sh, list[j].sh);
      n++;
    }
  console.log(`   ${fam.padEnd(20)} n=${list.length}  mean=${((sum / n) * 100).toFixed(1)}%`);
}
