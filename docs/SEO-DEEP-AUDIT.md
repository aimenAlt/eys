# SEO Deep Audit — Elevate Your Space Handyman

Generated: 2026-07-12  
**Implementation pass 2026-07-12 — P0-2 through P2/P3 applied. P0-1 images and O-* owner blockers still open.**

Scope: Full-site **text + HTML** SEO investigation of the built `dist/` plus source content. Findings below remain as the original audit record; Appendix A checkboxes track remediation.

**Site:** https://www.eyshandyman.com — Astro SSG, Tailwind, 0 client JS.
**Method / reproducibility:**
- `npm run build` → `npm run preview` → `npm run seo:crawl` (existing tool) — baseline pass/fail per page.
- `node scripts/seo-deep-analyze.mjs` (added, read-only) — meta duplication, canonical self-reference, OG resolution, per-page word count, alt quality, schema types → `.screenshots/seo-deep.json`.
- `node scripts/seo-content-analyze.mjs` (added, read-only) — main-scoped contextual link counts + near-duplicate body detection (word-shingle Jaccard) → console.
- Targeted `grep`/reads for term coverage, fonts, image attributes, schema, redirects.

---

## Executive summary

The site is technically **very healthy** and clears the existing crawl at **70/70 clean**. It ships **zero JavaScript**, every page is crawlable without JS, canonicals are self-referential, the JSON-LD graph is comprehensive, images are dimensioned/lazy-loaded, and templated pages are genuinely differentiated (no near-duplicate bodies). The gap between "healthy" and "SEO king" is now **content depth, keyword architecture, and trust/entity signals** — plus one real technical bug (broken OG images).

| Area | Verdict | Headline |
|------|---------|----------|
| Technical / crawl | Strong | 70/70 clean; self canonicals; 0 JS; clean 301s, robots, sitemap |
| Structured data | Strong (1 risk) | Full graph; but self-serving `aggregateRating` + empty `sameAs` |
| Social / OG images | **Broken** | Every page's `og:image` points to a missing file |
| Content depth | Weak | 14/14 service pages below the 500–800w target; thin blog/projects |
| Keyword architecture | Weak | Homepage ↔ legacy title collision; `/services/*` vs Katy legacy cannibalization |
| Query coverage | Weak | "near me" = 0 pages; "emergency/same-day" = 2; "free estimate/warranty" = 5 |
| E-E-A-T | Moderate | Veteran-owned story present; no named owner, license/insurance specifics hedged |
| Performance / CWV | Strong | Static, dimensioned images, `font-display:swap`; minor preload gap |
| Owner blockers | Open | GBP URL, Jobber URLs, real photos still empty |

### Severity counts
- **P0 (fix first):** 2
- **P1 (high value):** 5
- **P2 (polish):** 4
- **Owner blockers:** 4

---

## Confirmed strengths (do not regress)

- **Baseline crawl 70/70 clean** — titles/descriptions within length, single `<h1>`, `<main>/<header>/<footer>` landmarks + skip link, canonical present, no heading-level skips, no missing `alt`.
- **Canonicals:** 0 non-self-referential canonical on indexable pages; only `/404` carries `noindex`.
- **Fully static:** `dist/_astro` contains **0 JS files**; all core content renders without JavaScript.
- **Image hygiene:** 202/207 `<img>` have explicit `width`/`height`; 207/207 have `loading`; LCP hero uses `fetchpriority="high"` + `decoding="async"` → low CLS.
- **Differentiated content:** word-shingle Jaccard shows **no page pair ≥ 40%**; family mean overlap: service 16.8%, category 18.2%, community 13.3%, city 8.2%, legacy 11.5% — healthy.
- **Schema graph:** `HomeAndConstructionBusiness`, `WebPage`, `BreadcrumbList`, `Service`, `ItemList`, `FAQPage`, `BlogPosting` (+ `Organization`/`ImageObject`), `Review`/`AggregateRating`, `GeoCoordinates`, `PostalAddress`. Playbook TODOs (projects-index `WebPage`, blog `BlogPosting`) are resolved.
- **Redirects/robots/sitemap:** `public/_redirects` is a clean single-hop 301 map; `robots.txt` allows all + declares sitemap; build emits `sitemap-index.xml` for all 70 indexable URLs.

---

## P0 — Fix first

### P0-1 · Every page emits a broken `og:image` / `twitter:image`
**Evidence:**
- `SEOHead.astro` defaults `og:image` to `site.defaultOgImage` = `/images/og-default.jpg` (`src/data/images.ts:6,58`).
- `public/images/og-default.jpg` **does not exist** (nor in `dist/`). Hero image dirs (`public/images/{services,heroes,home,categories}`) are **empty**.
- `resolveOgImage()` (`src/data/business.ts:82`) returns the frontmatter hero path (e.g. `/images/services/tv-mounting.jpg`) **without checking existence**, so pages with a hero also point at a missing file.
- Deep scan: 41 pages use `og-default.jpg`; the other ~30 point at missing hero jpgs. Homepage `og:image` = `https://www.eyshandyman.com/images/og-default.jpg` (404).

**Impact:** Broken social share previews (FB/LinkedIn/X/iMessage), weaker branded CTR on shares; Google may ignore the OG entirely.

**Recommended fix (described):** Ship a real `public/images/og-default.jpg` (1200×630) and make `resolveOgImage()` fall back to a **known-existing** asset (mirror the `imageOrPlaceholder()` existence check already used for `<img>` `src`) so meta never references a missing file. Long term, per-page OG from real job photos.

### P0-2 · Title + keyword cannibalization across homepage, service pages, and legacy city pages
**Evidence (identical/near-identical `<title>` competing for the same query):**
- Homepage `<title>` = **"Handyman Services in Katy, TX | Elevate Your Space Handyman"** — **identical** to `/handyman-services-katy/` (legacy).
- Every `/services/<slug>/` detail page is titled "… **in Katy, TX** …", colliding with the Katy legacy city-service pages:
  - `/services/bathroom-remodeling/` = "Bathroom Remodeling in Katy, TX" ↔ `/bathroom-remodeling-services-katy/` (same head term); same pattern for kitchen-remodeling, drywall-repair, flooring-and-decor, door(-repair)-installation, electrical-services/electricians, cabinets.
- Also competing for "handyman Katy": homepage, `/handyman-services-katy/`, `/services/general-handyman-services/`, `/service-areas/katy/`.

**Impact:** Google splits authority/ranking signals between near-duplicate-intent URLs; unclear canonical target per keyword suppresses all of them.

**Recommended fix (described):** Assign one canonical owner per head term and differentiate the rest:
- Homepage → broad brand + "Katy & West Houston handyman" (not the exact city-service term).
- `/service-areas/katy/` → owns "Katy handyman."
- `/services/<slug>/` → service-led, made **city-neutral or multi-city** (drop the hard "in Katy, TX" anchoring, or expand to a service×city matrix).
- Legacy Katy `*-katy/` pages → either **301 to the canonical service page** (Richmond variants have distinct city intent and can stay) or repurpose each to a genuinely distinct service×city long-tail angle. Decide per-URL; do not leave duplicate titles.

---

## P1 — High value

### P1-1 · Service detail pages are thin (all 14 below target)
**Evidence:** Rendered main-content word counts — `drywall-repair` 256, `painting` 259, `door-repair-installation` 262, `furniture-assembly` 270, `bathroom-remodeling` 274, `ceiling-fan-installation` 274, `custom-carpentry` 277, `kitchen-remodeling` 279, `cabinet-installation` 282, `flooring-and-decor` 282, `electrical-services` 284, `general-handyman-services` 293, `tv-mounting` 316, `curtain-installation` 335. Playbook target: **500–800 words**. Markdown bodies are often 1 short paragraph (e.g. `tv-mounting.md` body = one sentence; most depth is frontmatter-driven).
**Fix:** Expand each with local examples, materials/options, process detail, price-factor prose, 3–5 FAQs, and contextual internal links to communities + category hub.

### P1-2 · Thin + under-linked blog and project pages
**Evidence:** Contextual (main-scoped) internal links — project pages **3 each**, blog posts **3–4 each**, `/reviews/` **2**. Word counts — projects 101–104w, blog posts 130–153w. Playbook rules 5–6 require blog/project pages to link to relevant community + service pages.
**Fix:** Add 2–4 in-body links from each blog/project to the matching `/services/*` and `/service-areas/*`; deepen project write-ups (scope, materials, before/after, area, service link).

### P1-3 · Missing high-intent query coverage
**Evidence (pages containing term, across dist):** "near me" **0**, "emergency"/"same-day"/"24-7" **2**, "free estimate/free quote/warranty/guarantee" **5**. These are top handyman query modifiers.
**Fix:** Weave natural language + dedicated FAQ/section coverage for "handyman near me", "free estimate", "same-day/emergency" (only where truthfully offered), and warranty/guarantee terms (pending owner confirmation of actual policy).

### P1-4 · Self-serving `aggregateRating` with no entity linkage
**Evidence:** Homepage and `/reviews/` emit `AggregateRating` 4.9 / 150 on the business node; `sameAs` is present on **0 pages**; no GBP/`g.page` link anywhere (homepage map links to generic `maps.google.com/?q=Katy,+TX`).
**Impact:** Self-serving `aggregateRating` on `LocalBusiness`/`Organization` is **not eligible for star rich results** and is a mild structured-data policy risk; the empty `sameAs` means the site isn't linked to its Google entity.
**Fix:** Set `googleReviews.profileUrl` (owner) so `sameAs` populates and the map/CTA point to the real GBP place; keep on-page reviews visible where `aggregateRating` is claimed, or rely on GBP for stars.

### P1-5 · E-E-A-T signal gaps
**Evidence:** `about.astro` has a solid veteran-owned narrative and process, but there is **no named owner/founder**, no years-in-business, no `Person`/`Organization` founder schema, and insurance/warranty is hedged ("Contact … for current insurance, warranty … details" — `schema.ts` home FAQ). Blog posts have no author byline beyond the org.
**Fix:** Add concrete, truthful trust signals — owner name/bio, founding year, verifiable license/insurance statement, `Organization` + `founder` `Person` schema, blog author. (Do not fabricate credentials.)

---

## P2 — Polish

### P2-1 · No font preload for critical text weight
`font-display:swap` is set (35 `@font-face`), but the `<head>` has **no `<link rel="preload">`**. Preloading the 1–2 latin woff2 weights used above the fold (hero H1 = 800) would tighten LCP and reduce swap shift.

### P2-2 · Font subset bloat in CSS
`global.css` imports full `@fontsource/inter/{400,500,600,700,800}.css`, pulling latin-ext/greek/cyrillic/vietnamese `@font-face` rules. `unicode-range` means the extra files aren't downloaded for English text (low runtime cost), but the CSS carries unused rules. Consider `@fontsource/inter/latin-*.css` imports to trim.

### P2-3 · Map/GBP link is a generic query
Homepage links to `maps.google.com/?q=Katy,+TX` rather than the real GBP place URL. Point to the verified place once `profileUrl` is set (ties into P1-4).

### P2-4 · Generic hero `alt` + placeholder imagery
Hero placeholder uses `alt="Handyman services"`. When real photos land, use descriptive, location/service-specific `alt`, WebP, and responsive `srcset` (keep existing `width`/`height`/`loading`/`fetchpriority`).

---

## Owner blockers (cannot be fixed in code)

| ID | Item | Where | Action |
|----|------|-------|--------|
| O-1 | GBP profile URL empty → empty `sameAs`, no map-pack linkage, self-serving stars | `src/data/business.ts` `googleReviews.profileUrl` | Paste verified GBP URL |
| O-2 | Jobber embed URLs empty → booking falls back to `/contact/` + `tel:` (works, but no embedded request/booking form) | `src/data/business.ts` `jobber.*` | Paste Client Hub URLs |
| O-3 | Real job photos missing → OG (P0-1) + hero placeholders sitewide | `public/images/**` per `IMAGE-ASSET-GUIDE.md` | Upload real JPGs |
| O-4 | Off-site citations / NAP consistency | Yelp, Angi, BBB, Nextdoor | Verify NAP matches `business.ts` exactly |

---

## Recommended remediation order

1. **P0-1** OG image bug (quick code + one asset) — stops broken shares immediately.
2. **P0-2** Keyword-architecture decision (homepage vs service vs city vs legacy) — unblocks ranking for money terms.
3. **P1-1 / P1-2** Content depth on services, then blog/projects + internal links.
4. **P1-3** Query-coverage copy.
5. **P1-4 / O-1** GBP URL + `sameAs` + rating strategy.
6. **P1-5** E-E-A-T signals.
7. **P2** performance/polish; owner assets (O-2/O-3/O-4) as they arrive.

## Suggested verification loop (after any future fix)
```bash
cd eys
npm run build
npm run preview -- --host 127.0.0.1 --port 4455   # terminal 1
BASE_URL=http://127.0.0.1:4455 npm run seo:crawl    # terminal 2
node scripts/seo-deep-analyze.mjs
node scripts/seo-content-analyze.mjs
```
Exit criteria: crawl stays 70/70 clean; 0 duplicate titles; 0 broken `og:image`; service pages ≥ 500 words; blog/project contextual links ≥ 4; `sameAs` populated once GBP is set.

---

# Appendix A — Per-page / per-file action checklist

Exhaustive, page-by-page list of what to update. Grouped by issue. `[owner]` = needs an asset/decision only the owner can provide; `[code]` = editable in the repo now.

## A1 · Images — exact missing files

**OG default (P0-1, sitewide impact)** `[owner asset + code]`
- [ ] `public/images/og-default.jpg` — create at 1200×630 (referenced by `SEOHead.astro` on every page; currently 404).
- [ ] `resolveOgImage()` in `src/data/business.ts` — add existence check so a missing hero falls back to the real default instead of a 404 `[code]`.

**Service hero photos (14)** — each `/services/<slug>/` currently points `og:image` + hero `<img>` at a missing file `[owner asset]`
- [ ] `/images/services/tv-mounting.jpg` → `/services/tv-mounting/`
- [ ] `/images/services/ceiling-fan.jpg` → `/services/ceiling-fan-installation/`
- [ ] `/images/services/general-handyman.jpg` → `/services/general-handyman-services/`
- [ ] `/images/services/furniture-assembly.jpg` → `/services/furniture-assembly/`
- [ ] `/images/services/drywall-repair.jpg` → `/services/drywall-repair/`
- [ ] `/images/services/painting.jpg` → `/services/painting/`
- [ ] `/images/services/door-install.jpg` → `/services/door-repair-installation/`
- [ ] `/images/services/electrical.jpg` → `/services/electrical-services/`
- [ ] `/images/services/cabinet-install.jpg` → `/services/cabinet-installation/`
- [ ] `/images/services/bathroom-remodel.jpg` → `/services/bathroom-remodeling/`
- [ ] `/images/services/kitchen-remodel.jpg` → `/services/kitchen-remodeling/`
- [ ] `/images/services/flooring.jpg` → `/services/flooring-and-decor/`
- [ ] `/images/services/custom-carpentry.jpg` → `/services/custom-carpentry/`
- [ ] `/images/services/curtain-install.jpg` → `/services/curtain-installation/`
- Note: service/legacy frontmatter sometimes declares a differently-named path (e.g. `tv-mounting.md` uses `/images/services/tv-mounting.jpg`, `bathroom-remodeling-services-katy.md` uses `/images/services/bathroom-remodeling.jpg`) that does **not** match `serviceHeroImages` in `src/data/images.ts`. **Reconcile filenames** so frontmatter and the map agree `[code]`.

**City hero photos (5)** — each `/service-areas/<city>/` `[owner asset]`
- [ ] `/images/heroes/katy.jpg` · `/images/heroes/cypress.jpg` · `/images/heroes/fulshear.jpg` · `/images/heroes/richmond.jpg` · `/images/heroes/west-houston.jpg`

**Category hero photos (2 files, 3 hubs)** `[owner asset]`
- [ ] `/images/categories/repairs-installs.jpg` → `/services/repairs-and-maintenance/` + `/services/installation-and-assembly/`
- [ ] `/images/categories/remodeling.jpg` → `/services/remodeling-and-upgrades/`

**Homepage section images (4)** `[owner asset]`
- [ ] `/images/home/who-we-are-1.jpg` · `who-we-are-2.jpg` · `why-choose-us-bg.jpg` · `cta-bg.jpg`

**Project gallery photos (3 projects)** — dirs exist but are empty; `og:image` uses the featured gallery src `[owner asset]`
- [ ] `/images/projects/cinco-ranch-fireplace-tv-mount/after-1.jpg` → `/projects/cinco-ranch-fireplace-tv-mount/`
- [ ] `/images/projects/cross-creek-ranch-garage-storage/…` → `/projects/cross-creek-ranch-garage-storage/`
- [ ] `/images/projects/sunterra-move-in-package/…` → `/projects/sunterra-move-in-package/`

**Community pages (12)** — no per-community hero in frontmatter, so all fall back to the (missing) default OG `[owner asset, optional]`
- [ ] Optionally add a real hero per community, else they inherit the default OG once A1 default is fixed: `aliana`, `bridgeland`, `cane-island`, `cinco-ranch`, `cross-creek-ranch`, `elyson`, `harvest-green`, `jordan-ranch`, `sunterra`, `tamarron`, `towne-lake`, `veranda`.

## A2 · Keyword cannibalization — per-URL decision

**Retitle / re-scope** `[code]`
- [x] `/` (homepage) — change `<title>` off the exact "Handyman Services in Katy, TX" head term to a brand/broad "Katy & West Houston" framing (defined in `src/pages/index.astro`).
- [x] `/service-areas/katy/` — confirm it owns "Katy handyman services."
- [x] All 14 `/services/<slug>/` — drop the hard "in Katy, TX" title anchor (make service-led / multi-city) so they stop colliding with the Katy legacy pages. Titles are built in `ServiceLayout.astro` / service frontmatter `seoTitle`.

**Legacy Katy pages — 301-redirect to the canonical service, or differentiate (9)** `[code + decision]`
- [x] `/handyman-services-katy/` (duplicates homepage title exactly) — **301 → `/service-areas/katy/`**; unpublished from sitemap
- [x] `/bathroom-remodeling-services-katy/` ↔ `/services/bathroom-remodeling/` — differentiated (kept; unique Katy copy)
- [x] `/kitchen-remodeling-katy/` ↔ `/services/kitchen-remodeling/` — differentiated
- [x] `/drywall-repair-katy/` ↔ `/services/drywall-repair/` — differentiated
- [x] `/floor-and-decor-katy/` ↔ `/services/flooring-and-decor/` — differentiated
- [x] `/door-installation-services-katy/` ↔ `/services/door-repair-installation/` — differentiated
- [x] `/electricians-katy/` ↔ `/services/electrical-services/` — differentiated
- [x] `/custom-cabinets-katy/` ↔ `/services/cabinet-installation/` or `/services/custom-carpentry/` — differentiated
- [x] `/house-painting-katy/` ↔ `/services/painting/` — differentiated

**Legacy Richmond pages — keep, but verify distinct intent (9)** `[review]`
- [x] `/bathroom-remodeling-richmond/`, `/kitchen-remodeling-richmond/`, `/drywall-repair-richmond/`, `/floor-and-decor-richmond/`, `/door-installation-richmond/`, `/electricians-richmond/`, `/custom-cabinets-richmond/`, `/house-painting-richmond/`, `/handyman-service-richmond/` — these target Richmond (no canonical `/services/*` competitor) so they can stay; just confirm titles/copy are city-specific.

## A3 · Thin pages — expand toward target word count

**Service detail pages (14, current → target ≥ 500w)** `[code/content]`
- [x] `drywall-repair` · `painting` · `door-repair-installation` · `furniture-assembly` · `bathroom-remodeling` · `ceiling-fan-installation` · `custom-carpentry` · `kitchen-remodeling` · `cabinet-installation` · `flooring-and-decor` · `electrical-services` · `general-handyman-services` · `tv-mounting` · `curtain-installation` — all ≥500w post-fix

**Other thin / low-link pages** `[code/content]`
- [x] `/reviews/` — add intro copy + links to services/areas.
- [x] `/projects/cross-creek-ranch-garage-storage/`
- [x] `/projects/sunterra-move-in-package/`
- [x] `/projects/cinco-ranch-fireplace-tv-mount/`
- [x] `/blog/hoa-patio-updates-bridgeland/`
- [x] `/blog/move-in-upgrades-sunterra/`

## A4 · Internal linking — add contextual links (target ≥ 4 in-body)
- [x] Each project page → link to its `service` slug (`tv-mounting`, etc.) + its community/area page.
- [x] Each blog post → link to the relevant `/services/*` and `/service-areas/*` pages (currently only ~3–4 generic links).
- [x] `/reviews/` → link out to top services + service areas.

## A5 · Query coverage — add natural, truthful copy
- [x] "handyman near me" — weave into homepage + city pages naturally.
- [x] "free estimate" / "free quote" — add to service pages + CTAs.
- [ ] "same-day" / "emergency" — only 2 pages; add **only where truthfully offered**. *(left unchecked — not claimed in research)*
- [ ] "warranty" / "guarantee" — pending owner confirmation of actual policy, then add to services + FAQ. *(left unchecked — owner blocker)*

## A6 · Font preload (global, not per-page) `[code]`
- [x] Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the 1–2 above-the-fold latin Inter weights (700/800) in the shared `<head>` (`src/layouts/BaseLayout.astro`). This is a **single global change**, not a per-page edit.
- [x] Optional: switch `global.css` imports to `@fontsource/inter/latin-*.css` to drop unused greek/cyrillic/vietnamese `@font-face` rules.
