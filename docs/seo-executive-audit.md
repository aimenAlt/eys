# Executive SEO / Entity Audit — Elevate Your Space Handyman

Generated: 2026-07-21T16:45:57.612498+00:00  
Scope: forensic, evidence-based, **read-only** (no site changes).  
Live site sampled: https://www.eyshandyman.com/

---

## 1. Executive conclusion

The **current website classifies as a Katy / West Houston handyman and multi-trade home-services company**, not as a dedicated electrician business.  
However, **two live legacy landings** — especially `/electricians-katy/` — use electrician identity language in the URL, title, and H1 while body copy correctly describes light electrical work and licensed coordination. That pattern is the strongest on-site explanation for electrician-query impressions in Google Search Console, alongside likely historical WordPress equity and unknown GBP category settings.

## 2. What Google is most likely to classify the current site as

**A. Primarily a handyman company** (multi-trade / light remodeling), with a secondary electrical-services offering.

## 3. Confidence level

**High** for sitewide classification (handyman-first).  
**Medium** for attributing GSC electrician impressions to specific causes without GSC URL-level and GBP category exports.

## 4. Evidence supporting the classification

| Evidence | Detail |
|----------|--------|
| Brand + home title/H1 | Veteran-Owned **Handyman** for Katy & West Houston |
| Nav IA | Services / Service Areas / Our Work — no Electrician nav item (`src/data/navigation.ts`) |
| Schema @type | `HomeAndConstructionBusiness` — not `Electrician` |
| Weighted prominence | Handyman 2337 vs Electrician-identity 112 (~20.8:1) |
| NAP | Katy, TX address in `src/data/business.ts` |
| Electrical honesty in body | FAQ/body: partner/coordinate licensed electricians when required |

## 5. Probable source of electrician-query pattern

**Uncertain combination**, ranked by current evidence:

1. **Current strong electrical pages** — especially `/electricians-katy/` (title/H1/slug = Electricians in Katy) — **FACT: capable of matching those queries now**
2. **Old website / retained WP URLs** — city-service slugs kept live; full WP content not in Git — **HYPOTHESIS: historical equity**
3. **GBP categories / external citations** — not inspected in this audit — **UNKNOWN, high priority**
4. Homepage-as-electrician — **UNLIKELY** (homepage is handyman-framed)
5. Schema @type Electrician — **NOT PRESENT**

## 6. Current canonical hostname

**https://www.eyshandyman.com**  
(Apex and HTTP variants 301 to https www.)

## 7. Current redirect health

**Healthy overall.**  
- HTTP→HTTPS: yes  
- Apex→www: yes (301)  
- Paths preserved; query strings preserved (sampled)  
- Legacy path redirects in `public/_redirects` work (e.g. `/light-fixtures/` → electrical services; `/handyman-services-katy/` → Katy hub)  
- Apex HTTP + legacy path can be a **3-hop** chain (acceptable, slightly long)  
- No loops observed

## 8. Current sitemap health

**Healthy.**  
Submit: `https://www.eyshandyman.com/sitemap-index.xml`  
Child has **75** URLs; indexable routes covered; `/home2/` correctly excluded.

## 9. Current indexability health

**Healthy with minor caveats.**  
- `/home2/` noindex (good) but live 200  
- Discontinued WP URLs return **404** (not 410)  
- Case-normalization not proven  
- Cloudflare adds AI-bot robots rules (does not block Googlebot search crawling of the site allow rule)

## 10. Current Katy geographic coherence

**Coherent Katy nucleus** with intentional West Houston multi-city constellation.  
Richmond legacy city-service cluster is the main secondary geographic node (by design). Sugar Land/Brookshire unpublished.

## 11. Top 10 findings (by severity)

| # | Severity | Finding |
|---|----------|---------|
| 1 | **High** | `/electricians-katy/` (and Richmond twin) title/H1/slug say **Electricians** while brand/body say handyman + licensed coordination — classic entity conflict / query magnet |
| 2 | **High** | GSC electrician impressions **cannot be attributed solely to old site**; current URLs are sufficient on-site causes |
| 3 | **Medium** | Full prior WordPress site absent from Git — historical depth unknown |
| 4 | **Medium** | aggregateRating reviewCount **150** hardcoded — must match live GBP |
| 5 | **Medium** | Old phone `(718) 986-1177` and old domain may persist in citations/GBP history (cleared from current `business.ts`) |
| 6 | **Medium** | Apex HTTP + legacy path = 3-hop redirect chains |
| 7 | **Medium** | Richmond city-service grid creates strong secondary local cluster |
| 8 | **Low** | `/home2/` preview still publicly reachable (noindex) |
| 9 | **Low** | Discontinued services use 404 rather than 410 |
| 10 | **Informational** | Site is handyman-first; electrical task content is legitimate and mostly well-qualified |

## 12. Top 10 safest recommendations

For each: Evidence · Expected benefit · Risk · Code change? · GBP change? · Safe while GBP recently reinstated?

| # | Recommendation | Evidence | Benefit | Risk | Code? | GBP? | Safe now? |
|---|----------------|----------|---------|------|-------|------|-----------|
| 1 | Export GSC Performance by **Page** for electrician queries | Need URL proof | Identifies which URLs drive impressions | None | No | No | **Yes** |
| 2 | Screenshot/export GBP primary + secondary categories | Unknown category influence | Separates Maps vs site causes | None | No | Read-only | **Yes** |
| 3 | Verify GBP phone is only `(346) 820-1629` and NAP matches site | Old 718 in Git history | Citation consistency | Low if correcting errors | No | Yes if mismatch | **Yes** (corrections OK; avoid category churn) |
| 4 | Verify aggregateRating 150/4.9 vs live GBP | `business.ts` | Avoid rich-result mismatch | Low | Only if count wrong | No | **Yes** |
| 5 | Owner decision workshop on electrician positioning (see §16) | Title/H1 conflict | Prevents reckless edits | None | No | No | **Yes** |
| 6 | Do **not** mass-delete electrical task content | Legitimate offering + clarified copy | Preserve useful relevance | High if removed blindly | No | No | N/A |
| 7 | Monitor `/electricians-katy/` in GSC after any future copy change | Top risk URL | Controlled experiment | Low if one URL | Later | No | Wait for decision |
| 8 | Keep www canonicalization as-is | Live 301s aligned | Stability | Breaking www would be harmful | No | No | **Yes — do nothing** |
| 9 | Keep sitemap submission on sitemap-index.xml | Config + live | Clean indexing | None | No | No | **Yes** |
| 10 | Citation sweep for 718 number / old domain | Historical NAP | Local pack trust | Low | No | Maybe | **Yes** |

## 13. Changes that should not be made yet

- Do **not** retitle/remove `/electricians-katy/` until owner answers §16 and GSC page data is reviewed
- Do **not** change GBP primary category while recently reinstated **without** category evidence and a positioning decision
- Do **not** strip ceiling-fan / fixture content to “de-electrician” the site
- Do **not** switch canonical host away from www
- Do **not** implement speculative mass 410s without GSC URL inspection
- Do **not** add `Electrician` schema types

## 14. Findings that require Google Search Console data

- Which exact URLs receive impressions for `electrician katy` (and variants)
- Whether apex vs www properties both exist / which is verified
- Whether old domain property still receives data
- Index coverage for `/electricians-*` vs `/services/electrical-services/`
- Presence of soft-404 or excluded-by-noindex anomalies
- Query→page mapping for handyman vs electrician vs remodel

## 15. Findings that require Google Business Profile data

- Primary category and all secondary categories (electrician present?)
- Service list items mentioning electrician/electrical
- Phone number history / alternate phones
- Website URL on GBP (www?)
- Review count vs schema 150
- Service areas list vs site
- Any reinstatement-related category resets

## 16. Exact questions the business owner must answer before category/content changes

1. Do you want to **appear for “electrician Katy”** queries, or only for handyman/electrical-handyman task queries?
2. Are you (or employees) a **licensed electrician** in Texas, or is electrical work **always** handyman-scope + subcontracted?
3. Should `/electricians-katy/` remain an electrician-intent landing, or be reframed to “Electrical handyman / light electrical in Katy”?
4. Is Richmond a true secondary market worth equal city-service landings, or should Katy dominate more aggressively?
5. What is the GBP **primary** category today, and which secondaries are intentional?
6. Should panel/rewire/EV/generator work ever be marketed, or permanently “coordinate only”?
7. Is the old `(718)` number fully retired everywhere (call tracking, Jobber, Yelp, Facebook)?
8. After GBP reinstatement, are you willing to accept **short-term ranking volatility** if categories or electrician landings change?

---

## Companion reports

1. [seo-page-inventory.csv](./seo-page-inventory.csv)
2. [seo-page-inventory.md](./seo-page-inventory.md)
3. [seo-domain-canonical-audit.md](./seo-domain-canonical-audit.md)
4. [seo-indexing-and-legacy-url-audit.md](./seo-indexing-and-legacy-url-audit.md)
5. [seo-entity-classification-report.md](./seo-entity-classification-report.md)
6. [seo-electrical-content-audit.md](./seo-electrical-content-audit.md)
7. [seo-local-geographic-coherence.md](./seo-local-geographic-coherence.md)
8. [seo-structured-data-audit.md](./seo-structured-data-audit.md)
9. [seo-internal-link-audit.md](./seo-internal-link-audit.md)
10. [seo-old-vs-new-comparison.md](./seo-old-vs-new-comparison.md)
11. [seo-executive-audit.md](./seo-executive-audit.md) (this file)
12. [seo-implementation-roadmap/](../../seo-implementation-roadmap/README.md) — executable implementation roadmap (Aug 4, 2026 governing standard; repo-root folder)
