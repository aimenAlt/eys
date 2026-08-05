# Internal Link & Architecture Analysis

Generated: 2026-07-21T16:45:57.612498+00:00

## Architecture shape

- Click depth from homepage (BFS on internal links): **max 2**
- Indexable pages unreachable from homepage: **0** 
- Orphan pages (zero inbound): **0** — none

Global header/footer navigation links nearly every major URL from every page. Raw inbound counts are saturated. Authority analysis should weight homepage + hub placements and in-content anchors, not footer volume alone.

## Hub outlinks (higher-value)

Homepage (`/`) electrical-related outLinks include:
- `/services/electrical-services/`
- `/services/ceiling-fan-installation/`

Handyman / location hubs are linked from primary nav: `/services/`, `/service-areas/`, `/book/`, `/our-work/`.

### Anchor-text category distribution (all internal anchors sitewide)

| Category | Anchors | Share |
|----------|--------:|------:|
| handyman | 3200 | 33.5% |
| location | 1289 | 13.5% |
| other-service | 1513 | 15.9% |
| remodeling | 558 | 5.8% |
| electrical | 381 | 4.0% |
| other | 2598 | 27.2% |

Electrical share of anchors ≈ **4.0%** — not disproportionate sitewide.

## Do electrical pages receive disproportionate internal authority?

- Sitewide footer/nav: No — they are peers among services/areas.
- Query-specialized landings: `/electricians-katy/` is linked from `/services/electrical-services/` body copy (city landings). That reinforces electrician intent without dominating IA.
- Handyman primary pages: Homepage, services index, general handyman, Katy hub are well represented in nav and pathways.

## Katy and Sunterra

- `/service-areas/katy/` is a primary city hub.
- `/service-areas/katy/sunterra-handyman/` linked from Katy hub / related lists / blog.
- Both reachable within 2 clicks from homepage.

## Sitemap-only / special

- XML sitemap excludes `/home2/` (noindex preview).
- HTML sitemap at `/sitemap/` lists routes for humans.
- No indexable orphan-only-via-sitemap pages detected.

## Facts vs hypotheses

- Fact: IA is shallow (depth ≤ 2) and handyman/location anchors dominate.
- Fact: Electrical anchors are a minority (~4.0%).
- Hypothesis: Electrician rankings owe more to on-page title/H1/slug of `/electricians-katy/` than to internal PageRank skew.
