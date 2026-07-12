/**
 * After `astro build` with GITHUB_PAGES=true, rewrite root-absolute
 * href/src/url(...) paths that still point at `/...` so they work under `/eys/`.
 *
 * Astro already prefixes its own asset URLs; this catches hardcoded template links.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

if (process.env.GITHUB_PAGES !== 'true') {
  console.log('prefix-pages-base: skipped (GITHUB_PAGES is not true)');
  process.exit(0);
}

const distDir = join(process.cwd(), 'dist');
const base = '/eys';
const exts = new Set(['.html', '.css', '.js', '.xml', '.txt', '.json']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (exts.has(extname(entry.name))) files.push(full);
  }
  return files;
}

function rewrite(content) {
  return content
    // href="/foo" or src='/foo' but not already /eys/ and not protocol-relative //
    .replace(/(href|src|poster)=(["'])\/(?!\/|eys\/)/g, `$1=$2${base}/`)
    // CSS url(/foo) but not url(/eys/...) or url(//...)
    .replace(/url\(\s*(['"]?)\/(?!\/|eys\/)/g, `url($1${base}/`)
    // content="/images/..." style attributes
    .replace(/(content)=(["'])\/(?!\/|eys\/)/g, `$1=$2${base}/`);
}

const files = await walk(distDir);
let changed = 0;
for (const file of files) {
  const before = await readFile(file, 'utf8');
  const after = rewrite(before);
  if (after !== before) {
    await writeFile(file, after);
    changed += 1;
  }
}

console.log(`prefix-pages-base: updated ${changed} file(s) under dist/ for base ${base}/`);
