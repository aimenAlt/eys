# Legacy WordPress URL Migration

Migration strategy for the old flat WordPress site → new Astro architecture.

**Implementation:** [`public/_redirects`](../public/_redirects) + live pages in [`src/content/city-services/`](../src/content/city-services/)

---

## Three page types (current architecture)

| Type | Example | Purpose |
|------|---------|---------|
| Regional service | `/services/electrical-services/` | Service across full territory |
| City hub | `/service-areas/katy/` | All services in a city |
| City-service landing | `/electricians-katy/` | Service + city search intent |

Community hubs live at `/service-areas/{city}/{community}/` — see existing community content.

---

## What redirects (301)

### City slug corrections

| Old | New |
|-----|-----|
| `/service-areas/katy-tx/` | `/service-areas/katy/` |
| `/service-areas/cypress-tx/` | `/service-areas/cypress/` |
| `/service-areas/fulshear-tx/` | `/service-areas/fulshear/` |
| `/service-areas/richmond-tx/` | `/service-areas/richmond/` |
| `/service-areas/west-houston-tx/` | `/service-areas/west-houston/` |

### Core pages

| Old | New |
|-----|-----|
| `/about-us/` | `/about/` |
| `/contact-us/` | `/contact/` |
| `/gallery/` | `/projects/` |
| `/handyman-services/` | `/services/general-handyman-services/` |

### Generic legacy service pages → regional services

| Old | New |
|-----|-----|
| `/tv-mounting/` | `/services/tv-mounting/` |
| `/painting/` | `/services/painting/` |
| `/kitchen-remodeling/` | `/services/kitchen-remodeling/` |
| `/drywall/` | `/services/drywall-repair/` |
| `/fan-installation/` | `/services/ceiling-fan-installation/` |
| `/cabinet-installation/` | `/services/cabinet-installation/` |
| `/furniture-assembly/` | `/services/furniture-assembly/` |
| `/light-fixtures/` | `/services/electrical-services/` |
| `/tiling/` | `/services/flooring-and-decor/` |
| `/custom-cabinets/` | `/services/custom-carpentry/` |
| `/curtian-installation/` | `/services/curtain-installation/` |

---

## What stays as live pages (legacy URLs preserved)

18 city-service landing pages at their original WordPress paths:

### Richmond

- `/door-installation-richmond/`
- `/bathroom-remodeling-richmond/`
- `/house-painting-richmond/`
- `/kitchen-remodeling-richmond/`
- `/drywall-repair-richmond/`
- `/electricians-richmond/`
- `/floor-and-decor-richmond/`
- `/handyman-service-richmond/`
- `/custom-cabinets-richmond/`

### Katy

- `/electricians-katy/`
- `/house-painting-katy/`
- `/floor-and-decor-katy/`
- `/custom-cabinets-katy/`
- `/door-installation-services-katy/`
- `/drywall-repair-katy/`
- `/bathroom-remodeling-services-katy/`
- `/kitchen-remodeling-katy/`

### Redirected (cannibalization fix)

| Old | New | Reason |
|-----|-----|--------|
| `/handyman-services-katy/` | `/service-areas/katy/` | Exact-intent collision with the Katy city hub; city page owns “Katy handyman” |

Content: `src/content/city-services/*.md`  
Layout: `src/layouts/CityServiceLayout.astro`  
Route: `src/pages/[legacySlug].astro`

Each page links to its city hub, regional service page, and relevant community pages.

---

## No redirect — returns 404 (discontinued or wrong intent)

| Old URL | Reason |
|---------|--------|
| `/furniture-repair-richmond/` | Furniture repair ≠ furniture assembly |
| `/furniture-repair-services-katy/` | Same |
| `/tv-repair-katy/` | TV repair ≠ TV mounting |
| `/garage-door-repair-katy/` | Not a listed service |
| `/tv-media-wall/` | Distinct from TV mounting — create `/services/media-walls/` when offered |

---

## Cloudflare

- **Apex → www:** `eyshandyman.com/*` → `https://www.eyshandyman.com/$1` (301) in Cloudflare dashboard
- **Path redirects:** `public/_redirects` (deployed with site)

---

## Regenerate city-service content

```bash
node scripts/generate-city-services.mjs
```

Edit `scripts/generate-city-services.mjs` or individual files in `src/content/city-services/` for page-specific copy.

---

## Related docs

- [07-seo-playbook.md](./07-seo-playbook.md)
- [02-site-architecture.md](./02-site-architecture.md)
