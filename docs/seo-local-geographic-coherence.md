# Local SEO & Katy Geographic Coherence

Generated: 2026-07-21T16:45:57.612498+00:00

## Positioning model (intended vs observed)

| Layer | Intended (business brief) | Observed on site |
|-------|---------------------------|------------------|
| Principal base | Katy | Yes — NAP city Katy; homepage Katy-first; largest page share |
| Larger region | West Houston | Yes — frequent in titles/body; `/service-areas/west-houston/` |
| Local MPCs | Sunterra and nearby | Yes — Sunterra community page + Katy cluster |
| Secondary cities | Cypress, Fulshear, Richmond, etc. | Yes — city hubs + Richmond legacy city-service cluster |

## Evidence Katy is nucleus

From `src/data/business.ts`:
- `address.city: 'Katy'`
- `address.formatted: '1308 Ventura Crk Dr, Katy, TX 77493, United States'`
- `areaServed: ['Katy', 'Cinco Ranch', 'Fulshear', 'Cypress', 'Richmond', 'West Houston']`

Homepage live title/H1 lead with Katy and West Houston.  
Primary-city classification of built pages: Katy 42 / Richmond 13 / multi 12 / others smaller.

Weighted geo prominence: Katy **1602** > West Houston **1182** > Richmond **1052** > Sunterra **649**.

## Pages that disproportionately promote another city

Richmond legacy city-service set (live, intentional WP migration):

- `/handyman-service-richmond/`
- `/electricians-richmond/`
- `/kitchen-remodeling-richmond/`
- `/bathroom-remodeling-richmond/`
- `/house-painting-richmond/`
- `/drywall-repair-richmond/`
- `/floor-and-decor-richmond/`
- `/custom-cabinets-richmond/`
- `/door-installation-richmond/`

These are not errors, but they create a second local entity cluster in SERPs. Katy has a similar set (the handyman city-service URL 301s to the city hub).

## Title/H1 vs Katy-first positioning

| Path | Title | H1 | Notes |
|------|-------|----|-------|
| `/kitchen-remodeling-richmond/` | Kitchen Remodeling in Richmond, TX / Elevate Your Space Handyman | Kitchen Remodeling in Richmond, TX | Richmond-focused legacy landing |
| `/service-areas/cypress/` | Cypress TX Handyman / Home Improvement & Repairs | Handyman Services in Cypress, TX | Non-Katy city hub |
| `/service-areas/richmond/` | Handyman Richmond TX / Fort Bend Home Upgrades | Handyman Services in Richmond, TX | Non-Katy city hub |
| `/service-areas/fulshear/` | Fulshear TX Handyman / New Home Upgrades | Handyman Services in Fulshear, TX | Non-Katy city hub |
| `/service-areas/west-houston/` | West Houston Handyman / Energy Corridor Home Improvements | Handyman Services in West Houston, TX | Non-Katy city hub |
| `/floor-and-decor-richmond/` | Flooring & Decor in Richmond, TX / Elevate Your Space Handyman | Flooring & Decor in Richmond, TX | Richmond-focused legacy landing |
| `/door-installation-richmond/` | Door Installation in Richmond, TX / Elevate Your Space Handyman | Door Installation in Richmond, TX | Richmond-focused legacy landing |
| `/custom-cabinets-richmond/` | Custom Cabinets in Richmond, TX / Elevate Your Space Handyman | Custom Cabinets in Richmond, TX | Richmond-focused legacy landing |
| `/handyman-service-richmond/` | Handyman Service in Richmond, TX / Elevate Your Space Handyman | Handyman Service in Richmond, TX | Richmond-focused legacy landing |
| `/house-painting-richmond/` | House Painting in Richmond, TX / Elevate Your Space Handyman | House Painting in Richmond, TX | Richmond-focused legacy landing |
| `/drywall-repair-richmond/` | Drywall Repair in Richmond, TX / Elevate Your Space Handyman | Drywall Repair in Richmond, TX | Richmond-focused legacy landing |
| `/electricians-richmond/` | Electricians in Richmond, TX / Elevate Your Space Handyman | Electricians in Richmond, TX | Richmond-focused legacy landing |
| `/bathroom-remodeling-richmond/` | Bathroom Remodeling in Richmond, TX / Elevate Your Space Handyman | Bathroom Remodeling in Richmond, TX | Richmond-focused legacy landing |

Assessment: mostly appropriate secondary-market pages, not accidental mislabeling of the homepage.

## Thin vs localized pages

Community word counts (thinnest first):
- `/service-areas/richmond/veranda-handyman/` — ~704 words
- `/service-areas/richmond/harvest-green-handyman/` — ~712 words
- `/service-areas/cypress/towne-lake-handyman/` — ~715 words
- `/service-areas/cypress/bridgeland-handyman/` — ~716 words
- `/service-areas/katy/tamarron-handyman/` — ~717 words
- `/service-areas/richmond/aliana-handyman/` — ~720 words
- `/service-areas/katy/cane-island-handyman/` — ~754 words
- `/service-areas/fulshear/cross-creek-ranch-handyman/` — ~756 words

Cinco Ranch community page is among the richest (~911 words) with localized MPC references. Blog posts add Sunterra and Bridgeland narrative.

## Geographic contradictions

| Check | Result |
|-------|--------|
| Schema address vs content | Consistent Katy street address |
| Phone | Single current number (346) 820-1629 |
| areaServed vs visible communities | Schema city list omits some MPC names that have pages — minor incompleteness |
| Sugar Land / Brookshire | `published: false` — not built |
| Old domain in legacy backup | elevateyourspacehandyman.com — not live |

## Coherence verdict

The site establishes a coherent Katy-based entity with an intentional West Houston multi-community service area. It is multi-nodal (Katy hub + Richmond landing cluster + other city hubs), not geographically random.

Risk: Richmond and Katy electrician landings can split electrical local relevance — confirm with GSC which URLs receive electrician impressions.

## Facts vs hypotheses

- Fact: NAP and homepage are Katy-centered.
- Hypothesis: Richmond city-service cluster may win non-Katy queries; fine if secondary, problematic if GBP identity drifts.
