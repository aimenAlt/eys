/**
 * Post-build SEO guard. Runs as npm "postbuild", so `npm run build` (locally
 * and in CI) fails when an indexable page regresses on something Bing
 * Webmaster Tools reports:
 *
 * - meta description missing, or shorter than 50 / longer than 160 characters
 *   (measured after decoding HTML entities, the way search engines count it).
 *
 * Pages whose meta robots contains "noindex" are skipped. Node built-ins only.
 *
 * Usage: node scripts/check-seo.mjs [distDir]   (default: dist)
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, process.argv[2] ?? 'dist');

const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 160;

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Attribute value from a single tag string, or undefined when absent. */
export function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  if (!m) return undefined;
  return m[1] ?? m[2] ?? m[3] ?? '';
}

function metaContent(html, name) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, 'name') ?? '').toLowerCase() === name) return attr(tag, 'content');
  }
  return undefined;
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of await htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  const robots = (metaContent(html, 'robots') ?? '').toLowerCase();
  if (robots.includes('noindex')) continue;
  checked += 1;
  const page = '/' + relative(DIST, file).replace(/index\.html$/, '');

  const raw = metaContent(html, 'description');
  if (raw === undefined || raw.trim() === '') {
    problems.push(`${page}: no meta description`);
  } else {
    const length = decodeEntities(raw).trim().length;
    if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
      problems.push(`${page}: meta description is ${length} characters (allowed ${DESCRIPTION_MIN}–${DESCRIPTION_MAX})`);
    }
  }
}

if (problems.length) {
  console.error(`\ncheck-seo: ${problems.length} problem(s) on ${checked} indexable pages:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log(`check-seo: ${checked} indexable pages OK`);
