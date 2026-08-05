# Old Website vs New Website Comparison (Git History)

Generated: 2026-07-21T16:45:57.612498+00:00

## Availability of evidence

| Evidence source | Available? | Notes |
|-----------------|------------|-------|
| Current Astro multi-page site in Git | **Yes** | `eys/` repo |
| Full previous WordPress site dump | **No** | Not present as a complete tree in Git |
| Single-page legacy homepage HTML | **Yes** | `legacy/current-homepage-backup/index.html` + initial commit `6b14355` `index.html` |
| Legacy URL map / redirects | **Yes** | `public/_redirects`, `docs/08-legacy-url-redirects.md` |
| Migrated city-service content from WP slugs | **Yes** | `src/content/city-services/*.md` added in commit `77f099a` |
| Live historical crawl of old domain | **Not in repo** | Would require GSC/archive.org outside this audit |

**Explicit statement:** The old WordPress website is **not fully present** in Git history. Comparison below uses the single-page precursor, redirect inventory, migration commits, and the current Astro site. Archive.org / GSC URL reports were not fetched for this audit.

## Timeline of material identity changes (Git)

| Commit | Date | Change |
|--------|------|--------|
| `6b14355` | 2026-05-08 | Create single `index.html` — handyman-first; keywords include `electrician`; phone `(718) 986-1177`; domain elevateyourspacehandyman.com in schema |
| `96d182c` | (phase 0+1) | Astro foundation / homepage migration |
| `83bfbb2` | 2026-07-09 | Site URL + email → `www.eyshandyman.com` / `contact@eyshandyman.com` |
| `77f099a` | ~2026-07 | Migrate city-service landings including `electricians-katy` / `electricians-richmond`; add `[legacySlug].astro` |
| `5498c67` / `e7c5780` | launch prep | Informational pages, sitemap, deploy docs (PR #7 launch prep) |
| `758d197` | 2026-07-13 | Phone → `(346) 820-1629` |
| Later | Jul 2026 | Our Work structure, Cloudflare deploy workflows, content refinements |

Closest “new website deployment era” marker in-repo: **launch-prep merge `5498c67`** plus domain cutover `83bfbb2` and ongoing Cloudflare workflow commits. Exact production-go-live timestamp in Cloudflare is **not recorded in Git**.

## Side-by-side comparison

### Titles / H1

| Surface | Old single-page | Current |
|---------|-----------------|---------|
| Home title | Handyman Services in Katy, TX \| Elevate Your Space Handyman | Veteran-Owned Handyman \| Katy & West Houston \| EYS |
| Home H1 | Handyman Services In Katy, Texas | Veteran-Owned Handyman for Katy & West Houston |
| Electrician landing titles | Not separate URLs in single-page backup | `/electricians-katy/` title: Electricians in Katy, TX… |

### Descriptions / keywords

| Old | New |
|-----|-----|
| Meta keywords included `electrician` | Keywords meta largely unused; topical SEO via pages |
| Description handyman/repairs/remodel list | Per-page meta; electrical pages disclose light electrical + coordination |

### Phone / email / domain

| Field | Old (Git/legacy) | Current |
|-------|------------------|---------|
| Phone | (718) 986-1177 | (346) 820-1629 |
| Email | eyad3396@gmail.com (schema) | contact@eyshandyman.com |
| Domain in schema | elevateyourspacehandyman.com | www.eyshandyman.com |

### Schema

| Old | New |
|-----|-----|
| HomeAndConstructionBusiness | HomeAndConstructionBusiness |
| reviewCount 152 | reviewCount 150 |
| areaServed smaller list | Expanded city list |
| No Electrician @type | No Electrician @type |

### Electrician terminology

| Old single-page | Current multi-page |
|-----------------|--------------------|
| Keywords: electrician | Dedicated URLs `/electricians-katy/`, `/electricians-richmond/` |
| Service tile H4: **Electrician** | Service page: Electrical Services + ceiling fans |
| List item: Electrical work | FAQ: not presenting as licensed electricians; coordination language |
| No separate electrician city SERP pages in backup | **Stronger electrician SERP surface area than the single-page backup** |

### Location terminology

| Old | New |
|-----|-----|
| Katy-focused single page | Katy + West Houston + 5 city hubs + 12 communities + Richmond/Katy city-service grid |

### Sitemap / canonical

| Old | New |
|-----|-----|
| Single URL site essentially | 75 sitemap URLs; canonical www; trailing slash |

## Was the historical site substantially more electrician-focused?

### Facts
1. The **single-page Git precursor was handyman-first**, with electrician as a keyword + service tile — not an electrician website.
2. The **current Astro site added dedicated electrician city landings** preserving WordPress slugs (`electricians-katy`, etc.).
3. Therefore: relative to the *single-page backup in Git*, the current site is **more capable of ranking for electrician queries**, not less.
4. Relative to the *missing full WordPress site* (unknown page count/content depth): **cannot prove** whether WP was more electrician-heavy overall. Redirect docs show WP had flat electrical-ish URLs (`/light-fixtures/`, `/fan-installation/`) and city electrician landings that were **kept live**.

### Hypotheses
- GSC electrician impressions likely reflect the **WordPress-era + retained `/electricians-katy/` URL equity**, possibly amplified by GBP categories — not a homepage that currently says Electrician.
- The old phone number and old domain may still appear in citations/GBP history (requires GBP/citation audit).

## Removed / renamed routes (documented)

See `docs/08-legacy-url-redirects.md` and `public/_redirects` for the authoritative rename matrix (gallery→our-work, small-repair-visit→handyman-to-do-list, handyman-services-katy→service-areas/katy, etc.).

## Unavailable evidence (must not invent)

- Full WP XML export / theme / plugin SEO titles
- Historical GSC performance by URL for electrician queries
- Wayback snapshots analysis (not run in this pass)
- Prior GBP primary/secondary categories over time
