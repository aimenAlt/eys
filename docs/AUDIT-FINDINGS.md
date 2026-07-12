# Audit Findings — Full-site visual + SEO

Generated: 2026-07-12  
Method: Playwright screenshots of **all 71 sitemap pages × desktop(1440) + mobile(390)** = 142 PNGs in `.screenshots/`, plus `seo:crawl` HTML checks.

Your earlier screenshots were treated as **seed examples only**. This report covers every page.

---

## Executive summary

| Severity | Count (baseline) | Status after fix pass |
|----------|------------------|------------------------|
| P0 | ~12 patterns (sitewide) | Fixed in code |
| P1 | ~25 patterns | Fixed or mitigated |
| P2 | polish / assets | Partially open (owner assets) |
| SEO crawl | 9/70 URLs with issues | Targeted fixes applied |

---

## P0 — Fixed

| ID | Symptom | Pages | Root cause | Fix | Verify |
|----|---------|-------|------------|-----|--------|
| V-01 | Light white band between black CTA and black footer (mobile) | Home, any page ending in dark CTA | `main` had `pb-20` for sticky CTA; body bg showed through | Removed `pb-20` from `ContentLayout` + `index.astro`; sticky clearance stays on `footer pb-24` | Re-screenshot `home-mobile`, any service mobile — CTA must sit flush on footer |
| V-02 | Centered short grid rows / side gutters | Services index, service areas, home links, communities | `.uniform-grid-row { justify-content: center }` | Changed to `flex-start` | Short last rows left-aligned |
| V-03 | Huge empty gap after content on local/service pages (mobile) | Service, city, community, category | `LocalAreaCTA` was `hidden md:block` so mobile ended on lightbg padding | CTA visible all breakpoints; shell `pb-0`; CTA full-bleed on mobile | Last section is black CTA against footer |
| V-20 | Mobile nav Service Areas list cut off / not scrollable | Sticky header grew taller than viewport with no overflow | `max-h-[calc(100dvh-5rem)] overflow-y-auto` on `#mobile-menu`; body scroll lock while open; bottom pad for sticky CTA | Open mobile menu → expand Service Areas → scroll to Richmond/Aliana and Call button |

---

## P1 — Fixed / mitigated

| ID | Symptom | Fix |
|----|---------|-----|
| V-10 | Excess `py-16` on short indexes | Tightened services, areas, projects, blog, contact, book, 404, legal |
| V-11 | Service cards look non-clickable | Added `footerText: 'View service →'` / `View area →` |
| V-12 | Home service link grid uneven @ 4 cols | Switched to `cols={3}` (14 → 3+3+3+3+2 left-aligned) |
| V-13 | Map grey box in screenshots | Real iframe present; headless often blank. Improved min-height + sr-only Maps link |
| S-01 | Meta says “13 services”, 14 published | Copy → 14; curtain added to Installation category + `allServiceSlugs` |
| S-02 | Privacy/Terms missing WebPage + BreadcrumbList | Added schema + longer descriptions |
| S-03 | Title/description length WARN | Trimmed curtain title + city/community metas |
| S-04 | Playbook said 13 services | Updated to 14 |

---

## P2 / Owner blockers (cannot invent)

| ID | Item | Action needed from owner |
|----|------|--------------------------|
| O-01 | Empty `googleReviews.profileUrl` | Paste GBP URL into `src/data/business.ts` |
| O-02 | Empty Jobber embed URLs | Paste into `jobber.requestFormUrl` / `onlineBookingUrl` |
| O-03 | Hero/project logo placeholders | Drop real JPGs per `docs/IMAGE-ASSET-GUIDE.md` |
| O-04 | Footer newsletter `type="button"` stub | Wire provider or remove until ready |
| O-05 | Blog/project thin inventory | More posts/projects (content, not layout) |

---

## SEO crawl baseline (pre-fix highlights)

Clean: **61/70**. Issues concentrated on:
- `/privacy/`, `/terms/` — short description + missing schema
- Several city/community metas over 160 chars
- `/services/` description long; curtain title long

Blog posts already emit `BlogPosting` via `BlogLayout`.

---

## Cross-cutting patterns observed (all families)

1. **Sticky Call / Get Quote** on mobile — intentional; must not leave light strips (fixed via padding model).
2. **BalancedGrid short rows** — left-aligned after fix.
3. **Stock/placeholder imagery** — widespread until owner assets land (documented WARN, not fake photos).
4. **Semantic HTML baseline strong** — landmarks, single h1, breadcrumbs, JSON-LD on money pages.

---

## Verify loop checklist

```bash
cd eys
npm run build
# terminal 1
npm run preview -- --host 127.0.0.1 --port 4321
# terminal 2
npm run screenshot
npm run seo:crawl
```

Exit criteria:
- [x] No light strip between final dark section and footer (mobile) — fixed via main padding + full-bleed CTA bands
- [x] No centered orphan gutters on service/area grids — left-aligned short rows
- [x] SEO crawl: privacy/terms clean; no missing required schema on legal — **70/70 clean**
- [x] Service count / curtain category consistent
- [x] Owner blockers listed above remain explicit

---

## Tooling added

- `npm run screenshot` — all sitemap URLs × 2 viewports
- `npm run seo:crawl` — HTML/SEO checks → `.screenshots/seo-crawl.{json,md}`
- `npm run audit:capture` — both
- `.screenshots/` gitignored
