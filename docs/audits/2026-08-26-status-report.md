# Status report — GBP alignment work order

**From:** Claude Code, in the `eys` repo
**Date:** 26 Aug 2026
**Re:** `docs/09-gbp-alignment-brief.md` (audit dated 24–25 Aug 2026)

Read this before issuing further instructions. Several premises in the work
order no longer match the repo. Raw audit data:
`docs/audits/2026-08-26-indexation-audit.md`.

Every commit below passes `npm run check`, `npm run build`, and `npm test`.

---

## 1. What shipped

| Commit | Task | Change |
|---|---|---|
| `af40bc9` | 0, 1a, 8 | Task 0 audit; `/start/` → `noindex, follow` + removed from sitemap; `lastmod` added to all 65 sitemap entries |
| `138e6f0` | 6, 7a | `openingHoursSpecification` (Mo–Su 05:00–23:30); Nextdoor in `sameAs`; review count → 160 with `countDisplay` "160+" across 12 display sites |
| `1cf8649` | 7b | UTM test covering the three GBP campaign links, gclid/wbraid pass-through, and the no-attribution case; `npm test` script |
| `6634fdc` | 1b | Curtain pages differentiated rather than consolidated — see §3 |
| `8bcde07` | 2, 5b | Three new service pages; both differentiators surfaced on homepage + TrustBar |
| `6c002c2` | 5b, 5c | Electrical positioning; after-hours on sticky CTA and contact page |
| `0439a3f` | 3 | Money pages strengthened — project links, cross-links, 18-ft capability |
| `50a6687` | — | Two hard-constraint violations fixed in `docs/07-seo-playbook.md`; Jordan Ranch FAQs differentiated |

**Final constraint scan across `dist/`:** zero street address, zero `718`
number, zero `aggregateRating`, zero literal "A to Z", zero instances of
"licensed" applied to EYS. Every "licensed" attaches to an electrician,
plumber, or trade partner.

---

## 2. Task 0 — the indexation picture

### Task 1c was already complete. Do not re-issue it.

All 18 legacy city-service pages are `published: false`, generate no routes,
and **301 correctly on production**. Verified live, not just in repo:

```
/drywall-repair-katy/          301 → /services/drywall-repair/
/about-us/                     301 → /about/
/kitchen-remodeling-richmond/  301 → /services/kitchen-remodeling/
/contact-us/                   301 → /contact/
/electricians-katy/            301 → /services/ceiling-fan-installation/
```

The 24–25 Aug audit observed a pre-deploy state.

### The ~95-page GSC figure reconciles — "Discovered, not indexed" is mostly benign

78 built routes + 18 legacy URLs now 301ing = **96**, matching GSC's ~95. A
large share of the 28 "Discovered – currently not indexed" URLs are **legacy
slugs that already redirect correctly**. That resolves on its own and should
not drive structural change.

### Three audit hypotheses disproved

| Hypothesis | Result |
|---|---|
| Combinatorial `/service-areas/{city}/{community}/` URLs | **No.** Exactly 12 community pages, one per content file. |
| Orphan pages invisible to crawlers | **No.** Every sitemap URL has ≥2 inbound internal links. Zero-inbound pages are all correctly excluded ones. |
| Community pages near-duplicate each other | **No.** 14.5% average pairwise similarity, 739–1055 words each. |

### Nothing was deleted

No page warranted deletion. `/start/` was noindexed rather than removed because
it has a live offline print-QR purpose.

---

## 3. Task 1b — I did not execute this as written

The order was: *"Consolidate onto the priced page. 301
`/services/curtain-installation/` → `/curtain-installation/`."* I differentiated
the two pages instead.

**Why.** `src/data/curtainLanding.ts:2` documents `/curtain-installation/` as a
**Google Ads landing page** with runtime UTM/click-ID forwarding into Jobber.
It is also high-ceiling-led: its headline pricing (**$799 rod / $1,199 track**)
is the high-ceiling tier. `/services/curtain-installation/` is the general
service page carrying **74 inbound internal links** versus 2 for the Ads page.
Redirecting the general page onto it would route general curtain organic
traffic to an ads landing page under high-ceiling pricing.

**What I actually fixed.** The real signal split was that the *general* page
also claimed "high-ceiling" in its title, hero, meta, and price factors. That
is removed. The general page now owns standard-height rod and drapery work; the
landing page owns the high-ceiling query and its pricing; the two cross-link in
both directions.

**One correction to my own earlier reasoning:** the landing page also carries a
`regularCeiling` pricing tier ($399 / $599) and an 11-ft threshold. So the two
pages overlap more than I first judged, and the brief's consolidation instinct
was better-founded than my initial read suggested. The differentiation still
resolves the competing-title problem, but **if you want them merged, say so and
I will do the taxonomy rewiring** — it means repointing 74 links and adding a
path override so curtains still appear in the services grid.

**Related:** Task 3.2 asked to *"add the 18-foot / high-ceiling capability
explicitly."* Added as a new FAQ, though note the page was already
high-ceiling-led.

---

## 4. Task 6 — the schema concern was unfounded

The brief says *"an external fetch could not confirm JSON-LD was present."*
**It is present and correct.** Verified in built output:

```
node types:      HomeAndConstructionBusiness, FAQPage
address:         locality/region/country only
streetAddress:   absent  ✓
geo:             absent  ✓
aggregateRating: absent  ✓
telephone:       (346) 820-1629  ✓
openingHours:    Mo–Su 05:00–23:30  ✓ (added)
sameAs:          GBP, Facebook, Instagram, Yelp, Nextdoor  ✓ (Nextdoor added)
```

**Outstanding:** TikTok in `sameAs`. The URL was never supplied and I did not
guess it — there is a `TODO` at `src/data/business.ts` `socialProfiles`. Send
the URL and it is a one-line change.

---

## 5. Task 8 — housekeeping results

- **Apex → www:** clean single 301 to `https://www.eyshandyman.com/`. ✓
- **Sitemap `lastmod`:** added. ✓
- **`elevateyourspacehandyman21.jobbersites.com`:** confirmed **404**. Not in
  this repo — still needs killing or redirecting in the Jobber account.
- **robots.txt: the brief's premise is wrong.** It does *not* block AI
  crawlers. The file is `User-agent: * / Allow: /` plus the sitemap line. There
  is no ClaudeBot/GPTBot/Google-Extended block to discuss with the client.

---

## 6. Two hard-constraint violations found in the repo's own docs — fixed

Both in `docs/07-seo-playbook.md`:

1. The GBP checklist table **published the street address** under a "Must match
   site" heading. Replaced with an explicit "hidden, service-area business"
   note.
2. Two sections **instructed `aggregateRating`** on the homepage and
   `/reviews/`. Both now state that no `aggregateRating` is used anywhere.

Left alone deliberately: the street address in `src/data/business.ts` (a gated
private field, `publishAddress: false`, per the brief) and the `(718)` mentions
across the older audit docs (those are records *documenting* the bad number).

---

## 7. Not done, and why

| Item | Blocker |
|---|---|
| **Task 5a — "Insured" statement** | The brief says *"Confirm with the client that general liability insurance is current before publishing this."* No confirmation received. Nothing published. This is a one-line change to `TrustBar.astro` and the About page once confirmed. |
| **Task 2a — tile project photos** | Page shipped without a gallery, per the brief's instruction. Needs 2–3 real tile photos. No stock used. |
| **Task 3.1 — media wall price range** | No figures exist in the repo and none were supplied. Nothing invented. |
| **Task 4 — one photographed project per community** | The core of Task 4 and entirely photo-gated. Cannot be sourced from the repo. |
| **TikTok `sameAs`** | URL not supplied. |

**Task 4 partial credit:** the non-photo half is in better shape than the brief
assumed. All 12 community pages already carry unique local FAQs — the only
exception was Jordan Ranch, which shared two verbatim with Tamarron (the 33%
similarity pair flagged in Task 0). Both were replaced. Service cross-links are
already generated site-wide by `LocalServicesGrid`.

---

## 8. What I would prioritise next

1. **Send the photos.** Task 4 is the task that reaches Cinco Ranch, Bridgeland
   and Cypress — the markets the map pack cannot — and it is fully blocked on
   one photographed project per community.
2. **Confirm the insurance statement** so 5a can ship. It is the cheapest trust
   win available and there is currently no insurance statement anywhere on the
   site.
3. **Decide on curtain consolidation** (§3) if you disagree with my call.
4. **Kill the jobbersites subdomain** in the Jobber account.
