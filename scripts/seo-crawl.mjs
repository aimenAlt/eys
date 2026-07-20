/**
 * Full-site SEO / semantic HTML crawl.
 * Discovers URLs from dist/sitemap-0.xml. Requires preview server.
 *
 * Usage:
 *   BASE_URL=http://localhost:4321 node scripts/seo-crawl.mjs
 * Output: .screenshots/seo-crawl.json + .screenshots/seo-crawl.md
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = join(import.meta.dirname, '../.screenshots');
const SITEMAP = join(import.meta.dirname, '../dist/sitemap-0.xml');

async function loadSitemapPaths() {
  await access(SITEMAP);
  const xml = await readFile(SITEMAP, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const u = new URL(m[1].trim());
    return u.pathname.endsWith('/') || u.pathname.includes('.') ? u.pathname : `${u.pathname}/`;
  });
}

function pageType(pathname) {
  if (pathname === '/') return 'home';
  if (pathname === '/services/') return 'services-index';
  if (pathname.startsWith('/services/') && pathname.split('/').filter(Boolean).length === 2) {
    const slug = pathname.split('/').filter(Boolean)[1];
    if (['repairs-and-maintenance', 'installation-and-assembly', 'remodeling-and-upgrades'].includes(slug)) {
      return 'category';
    }
    return 'service';
  }
  if (pathname === '/service-areas/') return 'areas-index';
  if (pathname.startsWith('/service-areas/')) {
    const parts = pathname.split('/').filter(Boolean);
    return parts.length === 2 ? 'city' : 'community';
  }
  if (pathname.startsWith('/projects/')) return pathname === '/projects/' ? 'projects-index' : 'project';
  if (pathname.startsWith('/our-work/')) return pathname === '/our-work/' ? 'projects-index' : 'project';
  if (pathname.startsWith('/blog/')) return pathname === '/blog/' ? 'blog-index' : 'blog-post';
  if (['/privacy/', '/terms/'].includes(pathname)) return 'legal';
  if (pathname === '/reviews/') return 'reviews';
  if (pathname === '/pricing/') return 'pricing';
  if (pathname === '/contact/') return 'contact';
  if (pathname === '/about/') return 'about';
  if (pathname === '/book/') return 'book';
  if (pathname === '/sitemap/') return 'sitemap-html';
  // root-level legacy city-service landings
  if (pathname.split('/').filter(Boolean).length === 1) return 'legacy-city-service';
  return 'other';
}

function expectedSchema(type) {
  const map = {
    home: ['HomeAndConstructionBusiness', 'FAQPage'],
    service: ['WebPage', 'BreadcrumbList', 'Service'],
    category: ['WebPage', 'BreadcrumbList', 'ItemList'],
    city: ['WebPage', 'BreadcrumbList'],
    community: ['WebPage', 'BreadcrumbList'],
    'legacy-city-service': ['WebPage', 'BreadcrumbList', 'Service'],
    'blog-post': ['WebPage', 'BreadcrumbList', 'BlogPosting'],
    project: ['WebPage', 'BreadcrumbList'],
    'projects-index': ['WebPage', 'BreadcrumbList'],
    reviews: ['WebPage', 'BreadcrumbList'],
    pricing: ['WebPage', 'BreadcrumbList'],
    legal: ['WebPage', 'BreadcrumbList'],
    contact: ['WebPage', 'BreadcrumbList'],
    about: ['WebPage', 'BreadcrumbList'],
    book: ['WebPage', 'BreadcrumbList'],
    'services-index': ['WebPage', 'BreadcrumbList'],
    'areas-index': ['WebPage', 'BreadcrumbList'],
    'blog-index': ['WebPage', 'BreadcrumbList'],
    'sitemap-html': [],
    other: ['WebPage'],
  };
  return map[type] ?? ['WebPage'];
}

const paths = await loadSitemapPaths();
console.log(`SEO crawl: ${paths.length} URLs`);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const results = [];

for (const pathname of paths) {
  const url = `${BASE}${pathname}`;
  const type = pageType(pathname);
  const row = {
    path: pathname,
    type,
    status: 0,
    title: '',
    titleLen: 0,
    description: '',
    descriptionLen: 0,
    canonical: '',
    h1Count: 0,
    h1Text: [],
    headings: [],
    hasMain: false,
    hasHeader: false,
    hasFooter: false,
    hasSkipLink: false,
    schemaTypes: [],
    missingSchema: [],
    imagesMissingAlt: 0,
    issues: [],
  };

  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    row.status = res?.status() ?? 0;
    if (row.status >= 400) {
      row.issues.push(`HTTP ${row.status}`);
      results.push(row);
      console.log(`FAIL ${pathname} HTTP ${row.status}`);
      continue;
    }

    const data = await page.evaluate(() => {
      const title = document.title || '';
      const description =
        document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
      const h1s = [...document.querySelectorAll('h1')].map((el) => el.textContent?.trim() || '');
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 80),
      }));
      const schemaTypes = [];
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const json = JSON.parse(s.textContent || '');
          const nodes = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json];
          for (const n of nodes) {
            if (n?.['@type']) {
              const t = n['@type'];
              if (Array.isArray(t)) schemaTypes.push(...t);
              else schemaTypes.push(t);
            }
          }
        } catch {
          /* ignore */
        }
      }
      let imagesMissingAlt = 0;
      for (const img of document.querySelectorAll('img')) {
        if (!img.hasAttribute('alt')) imagesMissingAlt++;
      }
      return {
        title,
        description,
        canonical,
        h1s,
        headings,
        hasMain: !!document.querySelector('main'),
        hasHeader: !!document.querySelector('header'),
        hasFooter: !!document.querySelector('footer'),
        hasSkipLink: !!document.querySelector('a[href="#main-content"], a.skip-link, a[href="#main"]'),
        schemaTypes: [...new Set(schemaTypes)],
        imagesMissingAlt,
      };
    });

    Object.assign(row, {
      title: data.title,
      titleLen: data.title.length,
      description: data.description,
      descriptionLen: data.description.length,
      canonical: data.canonical,
      h1Count: data.h1s.length,
      h1Text: data.h1s,
      headings: data.headings,
      hasMain: data.hasMain,
      hasHeader: data.hasHeader,
      hasFooter: data.hasFooter,
      hasSkipLink: data.hasSkipLink,
      schemaTypes: data.schemaTypes,
      imagesMissingAlt: data.imagesMissingAlt,
    });

    if (row.h1Count !== 1) row.issues.push(`h1 count=${row.h1Count}`);
    if (!row.hasMain) row.issues.push('missing <main>');
    if (!row.hasHeader) row.issues.push('missing <header>');
    if (!row.hasFooter) row.issues.push('missing <footer>');
    if (!row.hasSkipLink) row.issues.push('missing skip link');
    if (!row.title) row.issues.push('empty title');
    if (row.titleLen > 65) row.issues.push(`title long (${row.titleLen})`);
    if (row.titleLen > 0 && row.titleLen < 25) row.issues.push(`title short (${row.titleLen})`);
    if (!row.description) row.issues.push('empty description');
    if (row.descriptionLen > 160) row.issues.push(`description long (${row.descriptionLen})`);
    if (row.descriptionLen > 0 && row.descriptionLen < 50) row.issues.push(`description short (${row.descriptionLen})`);
    if (!row.canonical) row.issues.push('missing canonical');
    if (row.imagesMissingAlt > 0) row.issues.push(`${row.imagesMissingAlt} img missing alt attr`);

    const expected = expectedSchema(type);
    row.missingSchema = expected.filter(
      (t) => !row.schemaTypes.some((s) => s === t || s.includes(t)),
    );
    if (row.missingSchema.length) row.issues.push(`missing schema: ${row.missingSchema.join(', ')}`);

    // heading order: no jump h1→h3
    let prev = 0;
    for (const h of row.headings) {
      const level = Number(h.tag[1]);
      if (prev && level > prev + 1) {
        row.issues.push(`heading skip ${'h' + prev}→${h.tag}`);
        break;
      }
      prev = level;
    }

    console.log(`${row.issues.length ? 'WARN' : 'OK  '} ${pathname} [${type}] ${row.issues.join('; ') || 'clean'}`);
  } catch (err) {
    row.issues.push(err.message);
    console.error(`FAIL ${pathname}:`, err.message);
  }
  results.push(row);
}

await browser.close();

const withIssues = results.filter((r) => r.issues.length);
const summary = {
  total: results.length,
  clean: results.length - withIssues.length,
  withIssues: withIssues.length,
  byIssue: {},
};
for (const r of withIssues) {
  for (const i of r.issues) {
    const key = i.replace(/\(.*?\)/g, '').replace(/count=\d+/, 'count').trim();
    summary.byIssue[key] = (summary.byIssue[key] || 0) + 1;
  }
}

await writeFile(join(OUT, 'seo-crawl.json'), JSON.stringify({ summary, results }, null, 2));

const md = [
  '# SEO Crawl Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `Total: ${summary.total} | Clean: ${summary.clean} | With issues: ${summary.withIssues}`,
  '',
  '## Issue frequency',
  '',
  ...Object.entries(summary.byIssue)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `- **${v}** — ${k}`),
  '',
  '## Pages with issues',
  '',
  '| Path | Type | Issues |',
  '|------|------|--------|',
  ...withIssues.map((r) => `| ${r.path} | ${r.type} | ${r.issues.join('; ')} |`),
  '',
];
await writeFile(join(OUT, 'seo-crawl.md'), md.join('\n'));
console.log(`\nWrote ${join(OUT, 'seo-crawl.json')} and seo-crawl.md`);
console.log(`Summary: ${summary.clean}/${summary.total} clean, ${summary.withIssues} with issues`);
if (withIssues.length) process.exitCode = 1;
