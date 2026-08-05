# Canonical Domain & Redirect Audit

Generated: 2026-07-21T16:45:57.612498+00:00  
Method: live `curl -sS -I -L --max-redirs 10` plus repository config review.  
**No redirects or Cloudflare settings were changed.**

## Executive facts

| Question | Answer | Evidence |
|----------|--------|----------|
| Actual canonical hostname | **www.eyshandyman.com** | Live apex HTTPS → `https://www.eyshandyman.com/`; `astro.config.mjs` `site: 'https://www.eyshandyman.com'`; `src/data/business.ts` `url: 'https://www.eyshandyman.com'` |
| HTTP → HTTPS always? | **Yes** | `http://eyshandyman.com/` → 301 → `https://eyshandyman.com/` → 301 → www; `http://www...` → 301 → https www |
| Root → www or www → root? | **Apex → www** | `https://eyshandyman.com/` Location: `https://www.eyshandyman.com/` |
| Redirect chains? | **Yes for apex HTTP** (2 hops) | http apex → https apex → https www |
| Loops? | **No** | All tested chains terminate at 200 |
| Paths preserved? | **Yes** | Deep paths retested (services, electricians-katy, about, etc.) |
| Query strings preserved? | **Yes (sampled)** | `http://eyshandyman.com/contact/?utm_source=test&gclid=abc` final includes query |
| Status codes | **301** throughout observed hops | No 302/307/308 observed on domain canonicalization |
| Cloudflare root-to-WWW | **Consistent with site** | Docs (`docs/08-legacy-url-redirects.md`) state apex→www 301; live behavior matches; site config uses www |
| Canonical tags agree? | **Yes** | Sampled live pages use `https://www.eyshandyman.com/...` |
| Sitemap agrees? | **Yes** | Live + dist sitemap locs are www |
| OG URLs agree? | **Yes (sampled)** | Homepage & electrical pages `og:url` = www |
| JSON-LD URLs agree? | **Yes (current site)** | Business node `url: https://www.eyshandyman.com` |
| Internal links agree? | **Mostly yes** | Built HTML uses root-relative paths; absolute canonicals/OG use www |
| Contradictory signals? | **Limited** | Legacy backup HTML still references `elevateyourspacehandyman.com` (not deployed). `/home2/` noindexes but canonicalizes to `/` |

## Root variants (live)

### http://eyshandyman.com/
1. `301` → `https://eyshandyman.com/`
2. `301` → `https://www.eyshandyman.com/`
3. `200`

### http://www.eyshandyman.com/
1. `301` → `https://www.eyshandyman.com/`
2. `200`

### https://eyshandyman.com/
1. `301` → `https://www.eyshandyman.com/`
2. `200`

### https://www.eyshandyman.com/
1. `200` (terminal)

## Deep-path matrix (live)

Paths tested across all 4 host variants:

- `/services/electrical-services/`
- `/electricians-katy/`
- `/service-areas/katy/`
- `/about/`
- `/handyman-services-katy/` (path redirect after host normalization)
- `/light-fixtures/` (path redirect after host normalization)
- `/service-areas/katy-tx/` (path redirect after host normalization)

### Pattern

| Start host | Deep path (already slash-normalized) | Hops | Final |
|------------|--------------------------------------|------|-------|
| http://eyshandyman.com | any | 2 host hops | https://www… + same path |
| http://www… | any | 1 host hop | https://www… + same path |
| https://eyshandyman.com | any | 1 host hop | https://www… + same path |
| https://www… | any | 0 | 200 |

### Path redirects after host normalization (examples)

| Request (www https) | Hop | Final |
|---------------------|-----|-------|
| `/handyman-services-katy/` | 301 → `/service-areas/katy/` | 200 city hub |
| `/light-fixtures/` | 301 → `/services/electrical-services/` | 200 |
| `/service-areas/katy-tx/` | 301 → `/service-areas/katy/` | 200 |

**Note:** Apex HTTP + path redirect produces a **3-hop** chain (HTTP→HTTPS apex → www → path target). Functionally healthy; slightly longer than ideal for apex+legacy path combos.

## Trailing slash / case (live samples)

| Request | Result |
|---------|--------|
| `/about` (no slash) | 301 → `/about/` (via `_redirects`) |
| `/About/` (uppercase) | Observed behavior: does not soft-normalize to lowercase in the sample (treat as case-sensitive hosting) — **investigate if GSC shows case variants** |

## Config alignment

### Repository
- `astro.config.mjs`: `site: 'https://www.eyshandyman.com'`, `trailingSlash: 'always'`
- `src/data/business.ts`: `url: 'https://www.eyshandyman.com'`
- `public/robots.txt`: sitemap on www
- `docs/08-legacy-url-redirects.md`: documents Cloudflare apex→www rule

### Live robots.txt nuance (FACT)
Cloudflare injects managed AI-bot blocks **above** the site `robots.txt` content. Site still ends with:
```
User-agent: *
Allow: /
Sitemap: https://www.eyshandyman.com/sitemap-index.xml
```

## Contradictory / historical URL signals (not live indexable content)

| Signal | Location | Status |
|--------|----------|--------|
| `https://www.elevateyourspacehandyman.com` | `legacy/current-homepage-backup/index.html` schema `@id`/`url` | Backup only; not current deploy |
| Old phone `(718) 986-1177` | Git history + legacy backup (updated in commit `758d197`) | Not in current `src/data/business.ts` |
| Email `eyad3396@gmail.com` | Legacy backup schema | Current: `contact@eyshandyman.com` |

## Hypotheses

- **Hypothesis:** GSC property may still contain apex and/or old-domain properties; electrician impressions may attach to whichever property historically received WordPress URLs.
- **Fact:** Current production host + tags + sitemap consistently prefer **www**.
