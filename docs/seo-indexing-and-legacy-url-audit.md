# Sitemap, Robots, Indexing & Legacy URL Audit

Generated: 2026-07-21T16:45:57.612498+00:00

## Exact sitemap URL to submit in GSC

**`https://www.eyshandyman.com/sitemap-index.xml`**

Child sitemap: `https://www.eyshandyman.com/sitemap-0.xml`  
(Also listed in `public/robots.txt` / live robots.)

## Sitemap counts

| File | URL count | Notes |
|------|----------:|-------|
| `sitemap-index.xml` | 1 child | Points to sitemap-0.xml |
| `sitemap-0.xml` (dist + live) | **75** | All `https://www.eyshandyman.com/...` |
| Indexable HTML routes in dist | 75 | Matches sitemap (no indexable orphans missing) |
| HTML routes excluded | 2 | `/home2/` (noindex), `/404/` |

### Sitemap health checks

| Check | Result |
|-------|--------|
| URLs in sitemap that redirect | **None expected** — sitemap emits trailing-slash canonical paths only |
| URLs in sitemap that error | **None sampled**; live sitemap fetch returned 75 locs |
| Indexable URLs missing from sitemap | **None** |
| Non-indexable URLs in sitemap | **None** (`/home2/` filtered in `astro.config.mjs`) |
| Duplicate URL variants in sitemap | **None** (single host, trailing slash) |
| Orphan pages (0 internal links) | **None** — global nav/footer links nearly all pages |
| Broken internal links | **Not exhaustively HTTP-probed**; path graph resolves to known routes. Legacy discontinued URLs correctly 404 when requested directly. |

## Robots / noindex / headers

### Site robots (`public/robots.txt` / dist)
```
User-agent: *
Allow: /
Sitemap: https://www.eyshandyman.com/sitemap-index.xml
```

### Live robots (FACT)
Cloudflare managed content prepends AI crawler disallows (`GPTBot`, `Google-Extended`, etc.) and Content-Signal directives. Core allow + sitemap remain.

### noindex
- `/home2/`: meta `noindex, nofollow` (live verified); canonical → `/`
- Preview environments: `SEOHead.astro` sets noindex when GitHub Pages or Cloudflare preview detected

### x-robots-tag
Not observed on homepage response headers in live HEAD samples (no `x-robots-tag`).

### Trailing slash
`trailingSlash: 'always'` + `_redirects` entries for major sections without slash → 301 with slash.

### Uppercase / query params
- Query strings preserved through host redirects (sampled).
- Uppercase path normalization: **not confirmed as automatic** — treat as potential duplicate risk if GSC shows mixed case.

### 404 / 410
- Soft 404s: not detected on sampled real pages (real 404 status for missing paths).
- **410:** not implemented for discontinued URLs; they return **404**.

## Unpublished / non-built location content

| Content file | published | Built route? |
|--------------|-----------|--------------|
| `src/content/service-areas/sugar-land-tx.md` | false | No |
| `src/content/service-areas/brookshire-tx.md` | false | No |
| `src/content/city-services/handyman-services-katy.md` | false | No (URL 301s to city hub) |

## Astro sitemap configuration

From `astro.config.mjs`:
```js
sitemap({
  filter: (page) =>
    !page.includes('/404') &&
    !page.includes('/home2'),
})
```

## Legacy / old-URL recommendation matrix

| Old URL | Current status | Historical topic | Closest current replacement | Recommended future action | Reason |
|---------|----------------|------------------|-----------------------------|---------------------------|--------|
| `/electricians-katy/` | 200 live (Astro) | Electricians / light electrical Katy | `itself (also `/services/electrical-services/`)` | **keep + investigate title/H1** | Strong electrician-query landing; body clarifies licensed coordination |\n| `/electricians-richmond/` | 200 live | Electricians Richmond | `itself + `/services/electrical-services/`` | **keep + investigate title/H1** | Parity electrical city-service page |\n| `/handyman-services-katy/` | 301 → /service-areas/katy/ | Katy handyman | `/service-areas/katy/` | **keep 301** | Documented cannibalization fix; content file published:false |\n| `/handyman-service-richmond/` | 200 live | Richmond handyman | `itself + /service-areas/richmond/` | **keep** | Live city-service landing |\n| `/light-fixtures/` | 301 → /services/electrical-services/ | Light fixtures | `/services/electrical-services/` | **keep 301** | Legacy WP flat service → regional electrical |\n| `/fan-installation/` | 301 → /services/ceiling-fan-installation/ | Ceiling fans | `/services/ceiling-fan-installation/` | **keep 301** | Legacy WP |\n| `/tv-mounting/` | 301 → /services/tv-mounting/ | TV mounting | `/services/tv-mounting/` | **keep 301** | Legacy WP |\n| `/painting/` | 301 → /services/painting/ | Painting | `/services/painting/` | **keep 301** | Legacy WP |\n| `/kitchen-remodeling/` | 301 → /services/kitchen-remodeling/ | Kitchen remodel | `/services/kitchen-remodeling/` | **keep 301** | Legacy WP |\n| `/drywall/` | 301 → /services/drywall-repair/ | Drywall | `/services/drywall-repair/` | **keep 301** | Legacy WP |\n| `/cabinet-installation/` | 301 → /services/cabinet-installation/ | Cabinets | `/services/cabinet-installation/` | **keep 301** | Legacy WP |\n| `/furniture-assembly/` | 301 → /services/furniture-assembly/ | Assembly | `/services/furniture-assembly/` | **keep 301** | Legacy WP |\n| `/tiling/` | 301 → /services/flooring-and-decor/ | Tiling/flooring | `/services/flooring-and-decor/` | **keep 301** | Legacy WP |\n| `/custom-cabinets/` | 301 → /services/custom-carpentry/ | Custom cabinets | `/services/custom-carpentry/` | **keep 301** | Legacy WP |\n| `/curtian-installation/` | 301 → /services/curtain-installation/ | Curtains (typo slug) | `/services/curtain-installation/` | **keep 301** | Legacy typo preserved as source |\n| `/about-us/` | 301 → /about/ | About | `/about/` | **keep 301** | Legacy WP |\n| `/contact-us/` | 301 → /contact/ | Contact | `/contact/` | **keep 301** | Legacy WP |\n| `/gallery/` | 301 → /our-work/ | Gallery | `/our-work/` | **keep 301** | Legacy WP |\n| `/projects/` | 301 → /our-work/ | Projects | `/our-work/` | **keep 301** | Legacy WP |\n| `/handyman-services/` | 301 → /services/general-handyman-services/ | General handyman | `/services/general-handyman-services/` | **keep 301** | Legacy WP |\n| `/service-areas/katy-tx/` | 301 → /service-areas/katy/ | Katy area | `/service-areas/katy/` | **keep 301** | Slug fix |\n| `/services/small-repair-visit/` | 301 → /services/handyman-to-do-list/ | Productized visit | `/services/handyman-to-do-list/` | **keep 301** | Product rename |\n| `/furniture-repair-richmond/` | 404 live | Furniture repair | `none / furniture-assembly (different intent)` | **404 or investigate→410** | Documented discontinued; distinct from assembly |\n| `/furniture-repair-services-katy/` | 404 live | Furniture repair | `none` | **404 or investigate→410** | Discontinued |\n| `/tv-repair-katy/` | 404 live | TV repair | `none (≠ TV mounting)` | **404 or investigate→410** | Wrong intent vs mounting |\n| `/garage-door-repair-katy/` | 404 live | Garage door | `none` | **404 or investigate→410** | Not offered |\n| `/tv-media-wall/` | 404 live | Media walls | `future /services/media-walls/ or TV mounting` | **investigate** | Docs note create when offered |\n| `/home-current/` | removed from routes (git sunset) | Homepage variant | `/` | **404/gone OK** | Commit 0d7f006 sunset |\n| `elevateyourspacehandyman.com/*` | old domain (not this repo deploy) | Prior brand domain | `www.eyshandyman.com` | **investigate externally** | Present only in legacy backup schema; DNS/GSC outside this audit |

## Old phone / email / descriptions

| Item | Current site | Historical evidence |
|------|--------------|---------------------|
| Phone | `(346) 820-1629` (`src/data/business.ts`) | `(718) 986-1177` in initial `index.html` (commit `6b14355`) and until `758d197` (2026-07-13) |
| Email | `contact@eyshandyman.com` | `eyad3396@gmail.com` in legacy backup schema |
| Domain | `www.eyshandyman.com` | `elevateyourspacehandyman.com` in legacy backup; switched in `83bfbb2` |
| Business type language | Handyman / HomeAndConstructionBusiness | Legacy homepage keywords included `electrician`; service tile labeled **Electrician** |

## Facts vs hypotheses

- **Fact:** Current sitemap/indexability configuration is coherent for the Astro site.
- **Fact:** Multiple WordPress-era electrician-intent URLs still resolve as **200** pages (`/electricians-katy/`, `/electricians-richmond/`).
- **Hypothesis:** GSC “electrician katy” impressions likely include these live URLs and/or historical WordPress rankings — confirm with GSC Pages + Queries export.
- **Unavailable:** Full prior WordPress database/export is not in this Git repository (only redirects doc + single-page legacy HTML + Astro city-service migrations).
