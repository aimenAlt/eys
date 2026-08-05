# Structured Data Audit

Generated: 2026-07-21T16:45:57.612498+00:00

## Inventory of JSON-LD types (built site)

| @type | Page occurrences |
|-------|-----------------:|
| WebPage | 74 |
| BreadcrumbList | 74 |
| FAQPage | 52 |
| Service | 32 |
| HomeAndConstructionBusiness | 23 |
| Review | 5 |
| ItemList | 3 |
| BlogPosting | 2 |

Common pattern: `@context` + `@graph` via `wrapSchemaGraph` / page layouts.

## Business entity validation (HomeAndConstructionBusiness)

Source builders: `src/data/schema.ts` → `canonicalBusinessNode()`; data from `src/data/business.ts`.

| Field | Value observed | Assessment |
|-------|----------------|------------|
| name | Elevate Your Space Handyman | Matches brand |
| @type | HomeAndConstructionBusiness | Appropriate broad type; not Electrician |
| @id | https://www.eyshandyman.com/#business | Stable business id pattern |
| url | https://www.eyshandyman.com | Matches canonical host |
| telephone | (346) 820-1629 | Current; only phone in live schema set: ['(346) 820-1629'] |
| email | contact@eyshandyman.com | Current |
| address | 1308 Ventura Crk Dr, Katy, TX 77493, US | Katy NAP |
| geo | 29.7858, -95.8245 | Present |
| areaServed | Katy, Cinco Ranch, Fulshear, Cypress, Richmond, West Houston | City nodes |
| sameAs | GBP maps, Facebook, Instagram, Yelp | Configured in business.ts |
| priceRange | $$ | Present |
| image / logo | default OG / logo paths | Present |
| aggregateRating | 4.9 / reviewCount 150 | On home, home2, reviews |
| founder | Not in JSON-LD business node | Mentioned in FAQ copy only |

### aggregateRating notes
- `googleReviews.count: 150`, `rating: 4.9` in `src/data/business.ts`
- Legacy single-page HTML used reviewCount 152
- Risk: must match live GBP (not verified in this audit)

Pages embedding HomeAndConstructionBusiness: 23 (including `/`, `/home2/`, `/reviews/`, and area helpers where used).

## Conflicting signals

| Issue | Finding | Severity |
|-------|---------|----------|
| Conflicting phone numbers in live schema | None | OK |
| Conflicting www/non-www URLs in live schema | None on current pages | OK |
| Old domain in schema | Only in legacy/current-homepage-backup/index.html (not deployed) | Informational |
| Duplicate LocalBusiness-like entities | Multiple page graphs include HomeAndConstructionBusiness with shared @id pattern | Medium — monitor Rich Results |
| Conflicting business types | No Electrician / ElectricalContractor @type found | OK |
| Excessively broad types | HomeAndConstructionBusiness fits multi-trade handyman | OK |
| Schema reinforcing electrician classification | Service schema on `/electricians-*` uses electrician-titled Service names under handyman provider | High for query targeting |
| Schema vs visible content | Electrical FAQs disclose coordination / non-full-license scope — aligns with body; titles more aggressive | Medium |

## Breadcrumb / Service / FAQ

| Schema | Where |
|--------|-------|
| BreadcrumbList | Most non-home pages (~74) |
| Service | Service + legacy city-service pages (~32) |
| FAQPage | Home + many service/area pages (~52) |
| BlogPosting | 2 posts |
| Review | Reviews page (5) |
| ItemList | Category pages |

## Facts vs hypotheses

- Fact: Live JSON-LD presents a Katy handyman HomeAndConstructionBusiness, not an electrician business type.
- Hypothesis: Electrician SERP association comes from page titles/URLs/GBP categories more than from @type.
