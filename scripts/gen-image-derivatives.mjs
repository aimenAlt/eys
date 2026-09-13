/**
 * Generate responsive WebP derivatives for every photo in public/images.
 *
 * `SiteImage.astro` shipped a `srcset` prop that nothing could ever fill: the
 * site serves /public photos directly, so astro:assets never touches them and
 * no derivatives existed. Result: 0 of 74 built pages emitted a srcset while
 * 60%+ of traffic is mobile, downloading 1440px-wide originals on a 390px
 * screen.
 *
 * Output lands next to the original as `<name>-<width>w.webp` and is recorded
 * in `src/data/imageDerivatives.json`, which SiteImage reads at build time.
 * Both the derivatives and the manifest are committed so a clean CI checkout
 * regenerates nothing and the build stays fast.
 *
 * AVIF is deliberately NOT generated. A second full set roughly doubles both
 * encode time and repository size for a single-digit-percent size win over
 * WebP, which every browser released since 2020 supports.
 *
 * Usage:
 *   node scripts/gen-image-derivatives.mjs          # incremental (default)
 *   node scripts/gen-image-derivatives.mjs --force  # rebuild everything
 */
import { readdir, stat, writeFile, readFile, access } from 'node:fs/promises';
import { join, relative, extname, basename, dirname } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const IMAGES_DIR = join(ROOT, 'public/images');
const MANIFEST = join(ROOT, 'src/data/imageDerivatives.json');

/** Candidate widths. A width is skipped when it meets or exceeds the original. */
const WIDTHS = [480, 768, 1200, 1600];
const SOURCE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const DERIVATIVE_RE = /-\d+w\.(webp|avif)$/i;
/** Directories never referenced by the site. */
const SKIP_DIRS = new Set(['_candidates']);

const force = process.argv.includes('--force');

/**
 * The derivatives and the manifest are committed, so a build does not need
 * sharp — only regenerating does. Skip rather than fail when sharp cannot load
 * (platform binary missing, restricted install), so `prebuild` never blocks a
 * build that has everything it needs already.
 */
let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch (err) {
  const haveManifest = await access(MANIFEST).then(
    () => true,
    () => false,
  );
  if (!haveManifest) {
    console.error(`Image derivatives: sharp is unavailable and ${MANIFEST} does not exist.`);
    console.error('Install sharp (npm i -D sharp) and re-run to generate responsive images.');
    process.exit(1);
  }
  console.warn(`Image derivatives: skipped — sharp unavailable (${err.code ?? err.message}).`);
  console.warn('Using the committed manifest and derivatives as-is.');
  process.exit(0);
}

/**
 * LCP first, then the homepage section images, then everything else — so a
 * partial run (interrupted, or a cold CI cache) still covers what matters most.
 */
const PRIORITY = ['/images/home/hero.jpg', '/images/home/'];

function priorityRank(publicPath) {
  const index = PRIORITY.findIndex((prefix) => publicPath.startsWith(prefix));
  return index === -1 ? PRIORITY.length : index;
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...(await walk(full)));
      continue;
    }
    if (!SOURCE_EXT.has(extname(entry.name).toLowerCase())) continue;
    if (DERIVATIVE_RE.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

async function isUpToDate(target, sourceMtimeMs) {
  try {
    const info = await stat(target);
    return info.mtimeMs >= sourceMtimeMs;
  } catch {
    return false;
  }
}

const sources = (await walk(IMAGES_DIR)).sort((a, b) => {
  const pa = `/images/${relative(IMAGES_DIR, a)}`;
  const pb = `/images/${relative(IMAGES_DIR, b)}`;
  return priorityRank(pa) - priorityRank(pb) || pa.localeCompare(pb);
});

/** @type {Record<string, number[]>} */
const manifest = {};
let written = 0;
let skipped = 0;

for (const source of sources) {
  const publicPath = `/images/${relative(IMAGES_DIR, source).split('\\').join('/')}`;
  const info = await stat(source);
  let meta;
  try {
    meta = await sharp(source).metadata();
  } catch (err) {
    console.error(`SKIP ${publicPath}: ${err.message}`);
    continue;
  }
  const originalWidth = meta.width ?? 0;
  if (!originalWidth) continue;

  const stem = basename(source, extname(source));
  const dir = dirname(source);
  const widths = WIDTHS.filter((w) => w < originalWidth);
  if (!widths.length) continue;

  for (const width of widths) {
    const target = join(dir, `${stem}-${width}w.webp`);
    if (!force && (await isUpToDate(target, info.mtimeMs))) {
      skipped++;
      continue;
    }
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 74, effort: 4 })
      .toFile(target);
    written++;
    console.log(`WROTE ${publicPath.replace(/\.[^.]+$/, '')}-${width}w.webp`);
  }

  manifest[publicPath] = widths;
}

const serialized = `${JSON.stringify(
  Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))),
  null,
  2,
)}\n`;

let previous = '';
try {
  previous = await readFile(MANIFEST, 'utf8');
} catch {
  /* first run */
}
if (previous !== serialized) await writeFile(MANIFEST, serialized);

console.log(
  `Image derivatives: ${written} written, ${skipped} already current, ${Object.keys(manifest).length} originals indexed.`,
);
