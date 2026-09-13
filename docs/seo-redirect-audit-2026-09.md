# Redirect audit — public/_redirects, September 2026

Audit only. **No redirect rule was changed by this document.** Every recommendation
below needs sign-off before any edit to `public/_redirects`.

Companion to `docs/seo-electrical-content-audit.md`, which `public/_redirects`
already cites in a code comment.

## Method and its limits

Traffic figures come from the Search Console exports captured 2026-09-13
(`3mo/`, `28d/`, `16mo/`, `indexing/`). Two limits apply to everything below and
should be read into every number:

1. **Positions here are impression-weighted averages across all queries a URL
   appeared for.** They are not a rank for any single query. A URL can show a
   better average than another URL and still be absent from the SERP for the head
   term, because the average is dominated by whichever long-tail queries happened
   to surface it. Do not read these as "page A outranks page B".
2. **The external link count could not be determined.** The `links/` directory in
   the export folder is a byte-identical duplicate of `indexing/` — all four files,
   verified with `cmp`. There is no Links export in this dataset. Any backlink
   figure quoted elsewhere does not come from this data.

Every hop in the file resolves correctly. Nothing here is a broken redirect. This
is a targeting problem.

## Headline findings

**Legacy URLs carry 50,970 of 75,999 impressions over 16 months — 67.1% of all
page-level impressions on the property.** They are redirected away to pages that
have almost no impressions of their own.

**`/services/electrical-services/` has never recorded a single impression in 16
months.** It is the target of three distinct legacy sources carrying 23,191
impressions between them, and `/electricians-katy/` alone accounts for 22,651 of
those at a weighted position of 70.3. This is the largest addressable pool on the
property pointed at a page Google has never surfaced.

**Thirty-six rules send a geo-qualified legacy URL to a generic regional service
page — and a written city-specific page already exists for each one.** All 18
files in `src/content/city-services/` are complete (SEO title, meta description,
hero, local intro, neighborhoods, ZIP codes, housing notes, FAQs) and all 18 are
`published: false`, so `src/pages/[legacySlug].astro` builds none of them. The
equity these URLs earned is city-specific; the pages that could receive it exist
and are switched off.

**Thirteen redirect targets have never recorded an impression.**

## Target-level summary

| Target | Rules | Target impr (16mo) | Source impr (16mo) | Note |
|---|---:|---:|---:|---|
| `/services/electrical-services/` | 3 | **0** | 23,191 | never crawled |
| `/services/kitchen-remodeling/` | 3 | 7 | 6,584 | |
| `/services/bathroom-remodeling/` | 2 | 6 | 5,871 | |
| `/services/painting/` | 3 | 14 | 3,883 | |
| `/services/drywall-repair/` | 3 | 75 | 3,654 | |
| `/service-areas/richmond/` | 2 | 49 | 1,755 | |
| `/services/custom-carpentry/` | 3 | 61 | 1,688 | |
| `/contact/` | 2 | 242 | 1,593 | |
| `/services/flooring-and-decor/` | 3 | 6 | 1,546 | |
| `/about/` | 2 | 104 | 439 | |
| `/services/door-repair-installation/` | 2 | 25 | 330 | |
| `/services/general-handyman-services/` | 1 | 24 | 201 | |

Source impressions are deduplicated across each rule's slash and non-slash variants.

## Recommendations

**REPOINT (36 rules).** Every geo-qualified legacy source whose city-service page
already exists. `/drywall-repair-katy/` should serve or point to the Katy drywall
city-service page, not the generic `/services/drywall-repair/`. This requires
publishing those pages, which is a separate decision with its own risk — see the
open question below.

**KEEP (37 rules).** All trailing-slash normalization, the product rename, the
city slug fixes, and the legacy WordPress core-page rules. These are correct.

**KEEP AS-IS, EXPLICIT NOTE (3 rules).** The `/electricians-katy/` and
`/electricians-richmond/` rules carry a NOTE comment forbidding a repoint to a
ceiling-fan or electrician-branded page, on the grounds that EYS is a handyman
business and must not be positioned or indexed under an electrician identity.
**That note is honoured and should stand.** It is a legal-positioning constraint,
not an SEO one, and it outranks the traffic argument. The 23,191 impressions are
real but they are electrician-identity demand, and the correct response is to
capture the task-level subset (ceiling fan installation, fixture replacement,
outlet and switch work) on pages that do not claim the identity — not to repoint
these rules.

**LEAVE 404 (unchanged).** The four commented-out discontinued URLs are correctly
left to 404. `/garage-door-repair-katy/` (227 impressions, weighted position 76.1)
and `/tv-repair-katy/` are genuinely discontinued services; `/furniture-repair-*/`
is distinct intent. No redirect should be added.

## Open question for sign-off

Repointing the 36 geo rules means publishing 18 city-service pages. Those URLs
already exist in Google's index and already receive impressions, so this is
arguably restoring indexed URLs rather than minting new ones — but it is an
18-page publish against a property where 34 of 69 URLs already sit in
"Discovered — currently not indexed". That judgement is not this document's to
make.

## Full rule table

| # | Source | Target | Intent | Src impr (16mo) | Src wtd pos | Tgt impr | Flags | Rec |
|---|---|---|---|---:|---:|---:|---|---|
| 1 | `/about` | `/about/` | trailing-slash | 104 | 8.4 | 104 | — | KEEP |
| 2 | `/book` | `/book/` | trailing-slash | 189 | 11.4 | 189 | — | KEEP |
| 3 | `/start` | `/start/` | trailing-slash | 5 | 5.8 | 5 | — | KEEP |
| 4 | `/contact` | `/contact/` | trailing-slash | 242 | 38.5 | 242 | — | KEEP |
| 5 | `/pricing` | `/pricing/` | trailing-slash | 2 | 4.0 | 2 | — | KEEP |
| 6 | `/reviews` | `/reviews/` | trailing-slash | 5 | 3.0 | 5 | — | KEEP |
| 7 | `/privacy` | `/privacy/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 8 | `/terms` | `/terms/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 9 | `/blog` | `/blog/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 10 | `/services` | `/services/` | trailing-slash | 18 | 9.1 | 18 | — | KEEP |
| 11 | `/service-areas` | `/service-areas/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 12 | `/our-work` | `/our-work/` | trailing-slash | 2 | 1.0 | 2 | — | KEEP |
| 13 | `/sitemap` | `/sitemap/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 14 | `/home2` | `/home2/` | trailing-slash | 0 | — | 0 | never-crawled target | KEEP |
| 15 | `/services/small-repair-visit/` | `/services/handyman-to-do-list/` | product rename | 0 | — | 0 | never-crawled target | KEEP |
| 16 | `/services/small-repair-visit` | `/services/handyman-to-do-list/` | product rename | 0 | — | 0 | never-crawled target | KEEP |
| 17 | `/service-areas/katy-tx/` | `/service-areas/katy/` | city slug | 0 | — | 0 | never-crawled target | KEEP |
| 18 | `/service-areas/cypress-tx/` | `/service-areas/cypress/` | city slug | 0 | — | 33 | — | KEEP |
| 19 | `/service-areas/fulshear-tx/` | `/service-areas/fulshear/` | city slug | 0 | — | 10 | — | KEEP |
| 20 | `/service-areas/richmond-tx/` | `/service-areas/richmond/` | city slug | 0 | — | 49 | — | KEEP |
| 21 | `/service-areas/west-houston-tx/` | `/service-areas/west-houston/` | city slug | 0 | — | 0 | never-crawled target | KEEP |
| 22 | `/about-us/` | `/about/` | legacy WordPress (core) | 335 | 26.5 | 104 | — | KEEP |
| 23 | `/contact-us/` | `/contact/` | legacy WordPress (core) | 1351 | 26.8 | 242 | high-equity source (1351 impr) | KEEP |
| 24 | `/gallery/` | `/our-work/` | legacy WordPress (core) | 14 | 11.4 | 2 | — | KEEP |
| 25 | `/projects/` | `/our-work/` | legacy WordPress (core) | 0 | — | 2 | — | KEEP |
| 26 | `/projects` | `/our-work/` | legacy WordPress (core) | 0 | — | 2 | — | KEEP |
| 27 | `/handyman-services/` | `/services/general-handyman-services/` | legacy WordPress (core) | 201 | 25.8 | 24 | — | KEEP |
| 28 | `/tv-mounting/` | `/services/tv-mounting/` | legacy WordPress (flat service) | 0 | — | 0 | never-crawled target | KEEP |
| 29 | `/painting/` | `/services/painting/` | legacy WordPress (flat service) | 0 | — | 14 | — | KEEP |
| 30 | `/kitchen-remodeling/` | `/services/kitchen-remodeling/` | legacy WordPress (flat service) | 0 | — | 7 | — | KEEP |
| 31 | `/drywall/` | `/services/drywall-repair/` | legacy WordPress (flat service) | 2 | 2.5 | 75 | — | KEEP |
| 32 | `/fan-installation/` | `/services/ceiling-fan-installation/` | legacy WordPress (flat service) | 0 | — | 171 | — | KEEP |
| 33 | `/cabinet-installation/` | `/services/cabinet-installation/` | legacy WordPress (flat service) | 0 | — | 0 | never-crawled target | KEEP |
| 34 | `/furniture-assembly/` | `/services/furniture-assembly/` | legacy WordPress (flat service) | 0 | — | 0 | never-crawled target | KEEP |
| 35 | `/light-fixtures/` | `/services/electrical-services/` | legacy WordPress (flat service) | 0 | — | 0 | never-crawled target | KEEP |
| 36 | `/tiling/` | `/services/flooring-and-decor/` | legacy WordPress (flat service) | 0 | — | 6 | — | KEEP |
| 37 | `/custom-cabinets/` | `/services/custom-carpentry/` | legacy WordPress (flat service) | 48 | 3.8 | 61 | — | KEEP |
| 38 | `/curtian-installation/` | `/services/curtain-installation/` | legacy WordPress (flat service) | 0 | — | 59 | — | KEEP |
| 39 | `/tv-media-wall/` | `/services/media-walls/` | legacy WordPress (flat service) | 0 | — | 5 | — | KEEP |
| 40 | `/services/media-wall/` | `/services/media-walls/` | legacy WordPress (flat service) | 0 | — | 5 | — | KEEP |
| 41 | `/bathroom-remodeling-services-katy/` | `/services/bathroom-remodeling/` | legacy city-service | 5426 | 63.0 | 6 | geo→generic, city page exists (unpublished); high-equity source (5426 impr) | REPOINT |
| 42 | `/bathroom-remodeling-services-katy` | `/services/bathroom-remodeling/` | legacy city-service | 5426 | 63.0 | 6 | geo→generic, city page exists (unpublished); high-equity source (5426 impr) | REPOINT |
| 43 | `/bathroom-remodeling-richmond/` | `/services/bathroom-remodeling/` | legacy city-service | 445 | 43.6 | 6 | geo→generic, city page exists (unpublished) | REPOINT |
| 44 | `/bathroom-remodeling-richmond` | `/services/bathroom-remodeling/` | legacy city-service | 445 | 43.6 | 6 | geo→generic, city page exists (unpublished) | REPOINT |
| 45 | `/custom-cabinets-katy/` | `/services/custom-carpentry/` | legacy city-service | 1536 | 43.8 | 61 | geo→generic, city page exists (unpublished); high-equity source (1536 impr) | REPOINT |
| 46 | `/custom-cabinets-katy` | `/services/custom-carpentry/` | legacy city-service | 1536 | 43.8 | 61 | geo→generic, city page exists (unpublished); high-equity source (1536 impr) | REPOINT |
| 47 | `/custom-cabinets-richmond/` | `/services/custom-carpentry/` | legacy city-service | 104 | 15.3 | 61 | geo→generic, city page exists (unpublished) | REPOINT |
| 48 | `/custom-cabinets-richmond` | `/services/custom-carpentry/` | legacy city-service | 104 | 15.3 | 61 | geo→generic, city page exists (unpublished) | REPOINT |
| 49 | `/door-installation-services-katy/` | `/services/door-repair-installation/` | legacy city-service | 0 | — | 25 | geo→generic, city page exists (unpublished) | REPOINT |
| 50 | `/door-installation-services-katy` | `/services/door-repair-installation/` | legacy city-service | 0 | — | 25 | geo→generic, city page exists (unpublished) | REPOINT |
| 51 | `/door-installation-richmond/` | `/services/door-repair-installation/` | legacy city-service | 330 | 27.8 | 25 | geo→generic, city page exists (unpublished) | REPOINT |
| 52 | `/door-installation-richmond` | `/services/door-repair-installation/` | legacy city-service | 330 | 27.8 | 25 | geo→generic, city page exists (unpublished) | REPOINT |
| 53 | `/drywall-repair-katy/` | `/services/drywall-repair/` | legacy city-service | 2554 | 39.8 | 75 | geo→generic, city page exists (unpublished); high-equity source (2554 impr) | REPOINT |
| 54 | `/drywall-repair-katy` | `/services/drywall-repair/` | legacy city-service | 2554 | 39.8 | 75 | geo→generic, city page exists (unpublished); high-equity source (2554 impr) | REPOINT |
| 55 | `/drywall-repair-richmond/` | `/services/drywall-repair/` | legacy city-service | 1098 | 27.8 | 75 | geo→generic, city page exists (unpublished); high-equity source (1098 impr) | REPOINT |
| 56 | `/drywall-repair-richmond` | `/services/drywall-repair/` | legacy city-service | 1098 | 27.8 | 75 | geo→generic, city page exists (unpublished); high-equity source (1098 impr) | REPOINT |
| 57 | `/electricians-katy/` | `/services/electrical-services/` | legacy city-service | 22651 | 70.3 | 0 | never-crawled target; geo→generic, city page exists (unpublished); high-equity source (22651 impr) | REPOINT |
| 58 | `/electricians-katy` | `/services/electrical-services/` | legacy city-service | 22651 | 70.3 | 0 | never-crawled target; geo→generic, city page exists (unpublished); high-equity source (22651 impr) | REPOINT |
| 59 | `/electricians-richmond/` | `/services/electrical-services/` | legacy city-service | 540 | 44.9 | 0 | never-crawled target; geo→generic, city page exists (unpublished); high-equity source (540 impr) | REPOINT |
| 60 | `/electricians-richmond` | `/services/electrical-services/` | legacy city-service | 540 | 44.9 | 0 | never-crawled target; geo→generic, city page exists (unpublished); high-equity source (540 impr) | REPOINT |
| 61 | `/floor-and-decor-katy/` | `/services/flooring-and-decor/` | legacy city-service | 1470 | 49.9 | 6 | geo→generic, city page exists (unpublished); high-equity source (1470 impr) | REPOINT |
| 62 | `/floor-and-decor-katy` | `/services/flooring-and-decor/` | legacy city-service | 1470 | 49.9 | 6 | geo→generic, city page exists (unpublished); high-equity source (1470 impr) | REPOINT |
| 63 | `/floor-and-decor-richmond/` | `/services/flooring-and-decor/` | legacy city-service | 76 | 34.9 | 6 | geo→generic, city page exists (unpublished) | REPOINT |
| 64 | `/floor-and-decor-richmond` | `/services/flooring-and-decor/` | legacy city-service | 76 | 34.9 | 6 | geo→generic, city page exists (unpublished) | REPOINT |
| 65 | `/handyman-service-richmond/` | `/service-areas/richmond/` | legacy city-service | 1755 | 22.4 | 49 | geo→generic, city page exists (unpublished); high-equity source (1755 impr) | REPOINT |
| 66 | `/handyman-service-richmond` | `/service-areas/richmond/` | legacy city-service | 1755 | 22.4 | 49 | geo→generic, city page exists (unpublished); high-equity source (1755 impr) | REPOINT |
| 67 | `/handyman-services-katy/` | `/service-areas/katy/` | legacy city-service | 0 | — | 0 | never-crawled target; geo→generic, city page exists (unpublished) | REPOINT |
| 68 | `/handyman-services-katy` | `/service-areas/katy/` | legacy city-service | 0 | — | 0 | never-crawled target; geo→generic, city page exists (unpublished) | REPOINT |
| 69 | `/house-painting-katy/` | `/services/painting/` | legacy city-service | 3475 | 70.3 | 14 | geo→generic, city page exists (unpublished); high-equity source (3475 impr) | REPOINT |
| 70 | `/house-painting-katy` | `/services/painting/` | legacy city-service | 3475 | 70.3 | 14 | geo→generic, city page exists (unpublished); high-equity source (3475 impr) | REPOINT |
| 71 | `/house-painting-richmond/` | `/services/painting/` | legacy city-service | 408 | 38.6 | 14 | geo→generic, city page exists (unpublished) | REPOINT |
| 72 | `/house-painting-richmond` | `/services/painting/` | legacy city-service | 408 | 38.6 | 14 | geo→generic, city page exists (unpublished) | REPOINT |
| 73 | `/kitchen-remodeling-katy/` | `/services/kitchen-remodeling/` | legacy city-service | 6154 | 59.8 | 7 | geo→generic, city page exists (unpublished); high-equity source (6154 impr) | REPOINT |
| 74 | `/kitchen-remodeling-katy` | `/services/kitchen-remodeling/` | legacy city-service | 6154 | 59.8 | 7 | geo→generic, city page exists (unpublished); high-equity source (6154 impr) | REPOINT |
| 75 | `/kitchen-remodeling-richmond/` | `/services/kitchen-remodeling/` | legacy city-service | 430 | 38.3 | 7 | geo→generic, city page exists (unpublished) | REPOINT |
| 76 | `/kitchen-remodeling-richmond` | `/services/kitchen-remodeling/` | legacy city-service | 430 | 38.3 | 7 | geo→generic, city page exists (unpublished) | REPOINT |
