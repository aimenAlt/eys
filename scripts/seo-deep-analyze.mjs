/**
 * Deep SEO analysis over built dist/ HTML.
 * Read-only. Extends seo-crawl with: meta duplication, canonical self-reference,
 * OG image resolution, main-content word count, internal link counts, alt-text quality,
 * schema completeness. Writes .screenshots/seo-deep.json + prints summary.
 */
import { readFile, readdir, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST = join(import.meta.dirname, '../dist');
const OUT = join(import.meta.dirname, '../.screenshots');
const SITE = 'https://www.eyshandyman.com';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) files.push(p);
  }
  return files;
}

function attr(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function textFromMain(html) {
  // crude main extraction
  let m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  let body = m ? m[1] : html;
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return body;
}

const files = await walk(DIST);
const rows = [];

for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = '/' + relative(DIST, f).replace(/index\.html$/, '').replace(/\\/g, '/');
  const path = rel === '/' ? '/' : rel;
  const size = (await stat(f)).size;

  const title = attr(html, /<title>([^<]*)<\/title>/i);
  const description = attr(html, /<meta name="description" content="([^"]*)"/i);
  const canonical = attr(html, /<link rel="canonical" href="([^"]*)"/i);
  const ogImage = attr(html, /<meta property="og:image" content="([^"]*)"/i);
  const ogType = attr(html, /<meta property="og:type" content="([^"]*)"/i);
  const robots = attr(html, /<meta name="robots" content="([^"]*)"/i);

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  );

  // internal links (href to same-site or root-relative), exclude tel/mailto/#/http-external
  const hrefs = [...html.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
  const internal = hrefs.filter(
    (h) =>
      (h.startsWith('/') || h.startsWith(SITE)) &&
      !h.startsWith('//') &&
      !h.startsWith('/favicon') &&
      !h.startsWith('/apple-touch') &&
      !h.endsWith('.xml') &&
      !h.startsWith('#'),
  );
  const uniqueInternal = new Set(
    internal.map((h) => h.replace(SITE, '').split('#')[0].split('?')[0]),
  );

  // images + alt quality
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  let imgMissingAlt = 0;
  let imgEmptyAlt = 0;
  let imgGenericAlt = 0;
  for (const img of imgs) {
    const altM = img.match(/\balt="([^"]*)"/i);
    if (!altM) imgMissingAlt++;
    else if (!altM[1].trim()) imgEmptyAlt++;
    else if (/^(image|photo|picture|logo|icon|placeholder)$/i.test(altM[1].trim()))
      imgGenericAlt++;
  }

  // schema types
  const schemaTypes = [];
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const json = JSON.parse(m[1]);
      const nodes = Array.isArray(json)
        ? json
        : json['@graph']
          ? json['@graph']
          : [json];
      for (const n of nodes) {
        const t = n?.['@type'];
        if (Array.isArray(t)) schemaTypes.push(...t);
        else if (t) schemaTypes.push(t);
      }
    } catch {
      schemaTypes.push('PARSE_ERROR');
    }
  }

  const bodyText = textFromMain(html);
  const wordCount = bodyText ? bodyText.split(' ').length : 0;

  const canonicalSelf =
    canonical === `${SITE}${path}` || canonical === `${SITE}${path}`.replace(/\/$/, '') + '/';

  rows.push({
    path,
    sizeKB: +(size / 1024).toFixed(1),
    title,
    titleLen: title.length,
    description,
    descLen: description.length,
    canonical,
    canonicalSelf,
    ogImage,
    ogType,
    robots,
    h1Count: h1s.length,
    h1: h1s[0] || '',
    internalLinks: internal.length,
    uniqueInternalLinks: uniqueInternal.size,
    imgCount: imgs.length,
    imgMissingAlt,
    imgEmptyAlt,
    imgGenericAlt,
    schemaTypes: [...new Set(schemaTypes)],
    wordCount,
  });
}

// duplication maps
function dupMap(key) {
  const m = {};
  for (const r of rows) {
    const v = (r[key] || '').trim().toLowerCase();
    if (!v) continue;
    (m[v] ??= []).push(r.path);
  }
  return Object.entries(m).filter(([, ps]) => ps.length > 1);
}

const dupTitles = dupMap('title');
const dupDescs = dupMap('description');

// og image placeholder detection
const placeholderOg = rows.filter((r) => /placeholder|default/i.test(r.ogImage));
const nonSelfCanonical = rows.filter((r) => !r.canonicalSelf && r.robots.indexOf('noindex') === -1);

await mkdir(OUT, { recursive: true });
await writeFile(
  join(OUT, 'seo-deep.json'),
  JSON.stringify(
    { generated: new Date().toISOString(), total: rows.length, dupTitles, dupDescs, rows },
    null,
    2,
  ),
);

// console summary
console.log(`Analyzed ${rows.length} HTML pages\n`);
console.log(`Duplicate titles: ${dupTitles.length} groups`);
for (const [t, ps] of dupTitles) console.log(`   "${t.slice(0, 60)}" -> ${ps.join(', ')}`);
console.log(`\nDuplicate descriptions: ${dupDescs.length} groups`);
for (const [d, ps] of dupDescs) console.log(`   "${d.slice(0, 60)}..." -> ${ps.join(', ')}`);

console.log(`\nOG image = placeholder/default: ${placeholderOg.length} pages`);
console.log(`Unique OG image values: ${new Set(rows.map((r) => r.ogImage)).size}`);

console.log(`\nNon-self canonical (indexable): ${nonSelfCanonical.length}`);
for (const r of nonSelfCanonical) console.log(`   ${r.path} -> ${r.canonical}`);

console.log('\nWord count by page (main content):');
for (const r of [...rows].sort((a, b) => a.wordCount - b.wordCount)) {
  console.log(
    `   ${String(r.wordCount).padStart(5)}w  ${String(r.internalLinks).padStart(3)}lnk  ${r.path}`,
  );
}

const genericAlt = rows.filter((r) => r.imgGenericAlt > 0);
console.log(`\nPages with generic alt text: ${genericAlt.length}`);

console.log(`\nWrote ${join(OUT, 'seo-deep.json')}`);
