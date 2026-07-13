# SEO Playbook — Elevate Your Space Handyman

Master reference for local SEO, technical SEO, and content strategy. Use this doc when adding pages, publishing content, or deploying.

**Site:** https://www.eyshandyman.com  
**Market:** Katy, TX and West Houston (master-planned communities)  
**Primary goal:** Win local map pack + organic for high-intent handyman searches.

---

## North star

1. **Local pack first** — Google Business Profile (GBP) + NAP consistency + reviews drive most handyman leads.
2. **Organic depth second** — Service pages, community pages, and helpful content capture long-tail searches.
3. **Static crawlability** — Astro SSG; core content must render without JavaScript.
4. **No fake signals** — Never invent reviews, locations, licenses, or addresses.

---

## Current technical baseline (built)

| Layer | Status | Location |
|-------|--------|----------|
| Meta title + description | Per page | `src/components/seo/SEOHead.astro` |
| Canonical URLs | Trailing slash always | `astro.config.mjs`, `absoluteUrl()` |
| Open Graph + Twitter | Global default image | `src/data/business.ts` |
| JSON-LD | Homepage, services, areas, communities, pricing | `src/data/schema.ts` |
| Sitemap (XML, for Google) | Auto on build | `@astrojs/sitemap` → `/sitemap-index.xml` |
| Sitemap (HTML, for humans) | Auto on build | `/sitemap/` via `src/data/siteMap.ts` |
| robots.txt | Allow all + sitemap | `public/robots.txt` |
| Service pages | 14 published | `src/content/services/` |
| Category hubs | 3 pillars | `/services/repairs-and-maintenance/`, etc. |
| City pages | 5 published | `src/content/service-areas/` |
| Community pages | 12 published | `src/content/communities/` |
| Legacy WP redirects | 38 rules (301) | `public/_redirects` — see [08-legacy-url-redirects.md](./08-legacy-url-redirects.md) |

---

## Google Business Profile checklist

> **TODO:** Paste confirmed GBP URL into `src/data/business.ts` → `googleReviews.profileUrl` and add to `business.sameAs[]`.

| Field | Must match site |
|-------|-----------------|
| Business name | Elevate Your Space Handyman |
| Address | 1308 Ventura Crk Dr, Katy, TX 77493 |
| Phone | (346) 820-1629 |
| Website | https://www.eyshandyman.com |
| Primary category | Handyman (or closest GBP category) |
| Service areas | Katy, Cypress, Fulshear, Richmond, West Houston |

**GBP actions (monthly):**
- Post 1 update (project photo, seasonal tip, promo)
- Respond to all new reviews within 48 hours
- Add photos from real jobs (not stock)
- Keep services list aligned with site service pages

---

## Review strategy

**Real aggregate stats (use on site):**
- **150+** Google reviews
- **~4.9** star average

**How the site reflects this:**
- `src/data/business.ts` → `googleReviews: { count, rating, profileUrl }`
- TrustBar on homepage shows rating + review count
- JSON-LD `aggregateRating` on homepage and `/reviews/` uses Google stats (not limited to CMS sample reviews)
- CMS reviews (`src/content/reviews/`) = featured testimonials only; do **not** import all 150 into markdown

**When GBP URL is provided:**
1. Set `googleReviews.profileUrl`
2. Add same URL to `business.sameAs`
3. TrustBar + HomeReviewsSection link to GBP automatically

---

## Sitemaps

Two sitemaps serve different audiences — both update automatically on `npm run build`.

| Sitemap | URL | Audience |
|---------|-----|----------|
| **HTML** (browse all pages) | https://www.eyshandyman.com/sitemap/ | You, team, visitors |
| **XML** (crawler index) | https://www.eyshandyman.com/sitemap-index.xml | Google, Bing, other bots |

**How pages get included:**
- Published content (`published: true` in frontmatter) → included
- Draft content (`published: false`) → excluded
- New static pages under `src/pages/` → included after build

**Data source for HTML sitemap:** `src/data/siteMap.ts` — queries the same collections as `getStaticPaths`.

### Google Search Console (one-time setup)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://www.eyshandyman.com` (URL prefix or domain)
3. Verify ownership (DNS TXT record or HTML file — follow GSC prompts)
4. Left menu → **Sitemaps** → enter `sitemap-index.xml` → **Submit**
5. Status should show **Success** within a few days

**After each deploy:** GSC re-crawls the XML sitemap automatically. Re-submit only if GSC reports errors. Spot-check `/sitemap/` in the browser to confirm new pages appear.

### Legacy WordPress migration

The old flat WordPress URLs (e.g. `/tv-mounting/`, `/bathroom-remodeling-richmond/`) are handled by **301 redirects** in `public/_redirects`. Full mapping: **[08-legacy-url-redirects.md](./08-legacy-url-redirects.md)**.

**Cloudflare (one-time):** Redirect apex `eyshandyman.com/*` → `https://www.eyshandyman.com/$1` (301). Canonical site is always `www`.

After deploy, spot-check redirects:

```bash
curl -sI https://www.eyshandyman.com/tv-mounting/ | grep -iE 'HTTP|location'
curl -sI https://www.eyshandyman.com/about-us/ | grep -iE 'HTTP|location'
```

---

## Deploy checklist (every release)

```bash
npm run build
```

After build, verify:
1. `dist/sitemap-0.xml` includes all published URLs
2. `/sitemap/` lists the same pages grouped by section (~50 total)
3. New pages return 200 (not 404)
4. Spot-check canonical tags on 2–3 new pages

Expected URL count after full build: **~50 pages** (varies with blog/projects).

---

## Schema map

| Page type | JSON-LD |
|-----------|---------|
| Homepage | `HomeAndConstructionBusiness` + `FAQPage` + `aggregateRating` |
| Service detail | `WebPage`, `BreadcrumbList`, `Service`, optional `FAQPage` |
| Category hub | `WebPage`, `BreadcrumbList`, `ItemList` |
| City / community | `WebPage`, `BreadcrumbList`, local business node, optional `FAQPage` |
| Reviews | `WebPage`, `BreadcrumbList`, business + `aggregateRating` |
| Pricing | `WebPage`, `BreadcrumbList`, `FAQPage` |
| Blog post | `WebPage`, `BreadcrumbList` — **TODO:** add `BlogPosting` |
| Projects index | **TODO:** add `WebPage` + breadcrumbs |

---

## Internal linking rules

1. **Every service** appears in its category hub and `/services/` index.
2. **Service breadcrumbs:** Home → Services → Category → Service (when categorized).
3. **Community pages** link to all published services via `LocalServicesGrid`.
4. **Service pages** cross-link to communities via `ServiceAreaCrossLinks`.
5. **Blog posts** should link to relevant community + service pages (not just `/contact/`).
6. **Project pages** should link to the service slug when applicable.

---

## Keyword clusters

| Cluster | Primary URL | Support |
|---------|-------------|---------|
| Handyman Katy | Homepage, `/service-areas/katy/` | General handyman, punch-list |
| TV mounting Katy | `/services/tv-mounting/` | Move-in communities |
| Ceiling fan installation | `/services/ceiling-fan-installation/` | New construction communities |
| Drywall / painting | `/services/drywall-repair/`, `/services/painting/` | Repairs category hub |
| Bathroom / kitchen remodel | Remodeling category + service pages | Richmond, Fulshear upscale areas |
| [Community] handyman | `/service-areas/{city}/{community}/` | 12 community pages |

---

## Content SEO targets

| Content type | Target |
|--------------|--------|
| Service page body | 500–800 words + local examples + internal links |
| Community page | Unique intro, projects, FAQs (already structured) |
| Blog | 1 post/month, link to community + service |
| Project gallery | 1 project/month with photos, service link, area link |

**Priority thin pages to expand:** new services (electrical, cabinet, remodeling), project detail pages.

---

## Off-site SEO

- **Citations:** Yelp, Angi, BBB, Nextdoor — NAP must match `business.ts` exactly
- **Reviews:** Ask satisfied customers after job completion; link to GBP
- **GBP posts:** Monthly minimum
- **No** paid link schemes or fake directories

---

## Monthly rhythm

| Week | Task |
|------|------|
| 1 | Publish 1 blog post (community or service focused) |
| 2 | Add 1 project to gallery with real photos |
| 3 | GBP post + respond to reviews |
| 4 | Search Console check: coverage, queries, click-through |

---

## Do-not list

- Do not create thin city pages for areas we do not serve
- Do not stuff keywords into titles or headings
- Do not fake review counts in CMS beyond the real Google aggregate in `business.ts`
- Do not duplicate homepage copy on About or other pages
- Do not skip rebuild/deploy after adding published content
- Do not use stock photos as permanent OG images — move to real job photos

---

## Configuration reference

```ts
// src/data/business.ts
export const googleReviews = {
  count: 150,
  rating: 4.9,
  profileUrl: '', // ← paste GBP URL when ready
};
```

```ts
// When GBP URL is set, also add:
business.sameAs = ['https://g.page/...'];
```

---

## Semantic HTML checklist

Google does not rank sites for using "new" tags — it ranks pages that are **easy to crawl, understand, and use**. Semantic HTML supports that indirectly through clearer structure and accessibility.

### Required landmarks

| Landmark | Where | Notes |
|----------|-------|-------|
| `<header>` | `Header.astro` | Site branding + navigation |
| `<nav aria-label="Primary">` | `Header.astro` | Desktop + mobile menus |
| `<main id="main-content">` | `ContentLayout.astro`, homepage `index.astro` | One per page; skip link target |
| `<article>` | Hub pages (services, blog, projects, service-areas, reviews) | Primary page content wrapper |
| `<footer>` | `Footer.astro` | Site footer |
| `<address>` | Footer NAP block | Business address, phone, email — not italicized (`not-italic`) |

### Heading hierarchy

- **One `<h1>` per page** — page title or hero heading only.
- **Service detail pages:** H1 = service name; H2 = sections (What's included, FAQ, etc.).
- **City / community pages:** H1 = location name; H2 = sections; H3 = cards inside sections.
- **Card grids:** linked cards use `<h2>` (top-level hubs) or `<h3>` (nested under a section H2).
- Do not skip levels (e.g. H1 → H3 without H2).

### Links and interactive elements

- **Full-card links:** the entire card is one `<a>` — no nested buttons or links inside.
- **Phone:** always `tel:+13468201629` format via `site.phoneTel`.
- **Email:** `mailto:` links in footer and contact areas.
- **Breadcrumbs:** `<nav aria-label="Breadcrumb">` — last item is plain text on detail pages.

### Images

- Meaningful photos: descriptive `alt` text (service, project, hero).
- Decorative icons/bars: `aria-hidden="true"` or `alt=""`.
- Maps/iframes: descriptive `title` attribute.

### Pre-publish checklist

1. View page source — confirm `<main>`, one H1, logical heading order.
2. Run Lighthouse accessibility audit (target 90+).
3. Confirm JSON-LD validates in [Google Rich Results Test](https://search.google.com/test/rich-results).
4. Confirm canonical URL and meta description are unique per page.
5. After GBP URL is set, add to `business.sameAs[]` and `googleReviews.profileUrl`.

### Grid layout (UX + consistency)

All card/link grids use `BalancedGrid` with **uniform tile width** — short final rows are centered, not stretched. See `src/utils/balancedGrid.ts` and `src/components/ui/BalancedGrid.astro`.

---

## Related docs

- [PROJECT-START-HERE.md](../PROJECT-START-HERE.md) — build doctrine
- [02-site-architecture.md](./02-site-architecture.md) — URL structure
- [04-implementation-roadmap.md](./04-implementation-roadmap.md) — phased build plan
- [08-legacy-url-redirects.md](./08-legacy-url-redirects.md) — WordPress → Astro 301 map
