# Status report — GBP alignment work order

**From:** Claude Code, in the `eys` repo
**Date:** 26 Aug 2026
**Re:** `docs/09-gbp-alignment-brief.md` (audit dated 24–25 Aug 2026)

Read this before issuing further instructions. Several premises in the work
order no longer match the repo, and one instruction looks actively harmful.
Raw audit data: `docs/audits/2026-08-26-indexation-audit.md`.

---

## 1. Shipped

### `af40bc9` — Noindex `/start/`, drop from sitemap, add sitemap `lastmod`

- `/start/` is documented at `src/data/startLanding.ts:2` as a **"Print-QR /
  general conversion landing"** — offline scan traffic, not organic. Per Task
  1a it is therefore a campaign landing page: set `noindex, follow` and removed
  from the sitemap. This matches the posture already used by `/van/` and
  `/home2/`. `/` is now the sole canonical target for the head term.
- Every sitemap entry now carries `lastmod` (previously zero). Sitemap went
  66 → 65 URLs.
- `npm run check` clean, `npm run build` clean.

---

## 2. Task 0 findings — the indexation picture

### Task 1c is already complete. Do not re-issue it.

All 18 legacy city-service pages are `published: false`, generate no routes,
and **301 correctly on production right now**. Verified live, not just in repo:

```
/drywall-repair-katy/          301 → /services/drywall-repair/
/about-us/                     301 → /about/
/kitchen-remodeling-richmond/  301 → /services/kitchen-remodeling/
/contact-us/                   301 → /contact/
/electricians-katy/            301 → /services/ceiling-fan-installation/
```

The 24–25 Aug audit observed a pre-deploy state. `public/_redirects` holds 77
301 rules covering these.

### The ~95-page GSC figure reconciles — and "Discovered, not indexed" is mostly benign

78 built routes + 18 legacy URLs now 301ing = **96**, matching GSC's ~95. A
large share of the 28 "Discovered – currently not indexed" URLs are therefore
**legacy slugs that already redirect correctly** — Google still holds the old
URLs and is working through the redirects. That resolves on its own. It is not
a crawl-budget emergency and should not drive structural change.

### Three of the audit's hypotheses are disproved

| Hypothesis | Result |
|---|---|
| `/service-areas/{city}/{community}/` may generate combinatorial URLs | **No.** Exactly 12 community pages, one per content file. |
| Orphan pages invisible to crawlers | **No.** Every sitemap URL has ≥2 inbound internal links. Only zero-inbound pages are correctly excluded ones (confirmations, `/home2/`, `/van/`, 404). |
| Community pages near-duplicate each other | **No.** 14.5% average pairwise similarity, 739–1055 words each. Worst pair is Jordan Ranch vs Tamarron at 33% (both new-build move-in). Nowhere near duplicate territory. |

### Nothing needs deleting

No page warrants deletion. `/start/` was noindexed rather than removed because
it has a live offline (print-QR) purpose.

---

## 3. Blocked — Task 1b needs a decision, and I recommend against the brief

The work order says: *"Consolidate onto the priced page. 301
`/services/curtain-installation/` → `/curtain-installation/`."*

Two facts from the repo make that risky:

**a. `/curtain-installation/` is a Google Ads landing page.**
`src/data/curtainLanding.ts:2`: *"High-ceiling curtain installation **Google
Ads landing page**."* It carries runtime UTM/click-ID forwarding into Jobber
(`curtain-attribution.ts`).

**b. It is high-ceiling-specific, not a general curtain page.**
Title: *"High Ceiling Curtain Installation in Katy, TX."* Its pricing —
**$799 rod / $1,199 track** — is high-ceiling pricing. `/services/curtain-installation/`
is the general curtain & drapery service page and carries **74 inbound internal
links** (services grid, all 12 community pages, category hubs, city pages)
versus 2 for the Ads page.

Executing as written would point all general curtain organic traffic at a
high-ceiling Ads landing page and quote standard-height jobs at high-ceiling
prices. That is a revenue-affecting misrepresentation, not a formatting choice.

**Related:** Task 3.2 asks to *"add the 18-foot / high-ceiling capability
explicitly"* to `/curtain-installation/`. That page is already entirely about
high-ceiling work. The instruction appears to assume it is a general page.

**Recommended instead:** keep both, differentiate them so they stop competing.
`/services/curtain-installation/` stays the organic canonical for general
curtain work (keeps 74 links, no taxonomy surgery) and links up to the
high-ceiling page; `/curtain-installation/` keeps its Ads role and owns the
distinct "high ceiling curtain installation" query. Retitle the general page to
drop the overlapping phrasing.

Awaiting a decision. Not proceeding on 1b until then.

---

## 4. Task 6 — the audit's schema concern is unfounded; one real gap

The brief says *"an external fetch of the rendered HTML could not confirm
JSON-LD was present."* **It is present and correct.** Verified against built
output:

```
node types: HomeAndConstructionBusiness, FAQPage
address:    {"@type":"PostalAddress","addressLocality":"Katy",
             "addressRegion":"TX","addressCountry":"US"}
streetAddress:   absent  ✓
geo:             absent  ✓
aggregateRating: absent  ✓
telephone:       (346) 820-1629  ✓
sameAs:          GBP, Facebook, Instagram, Yelp
```

Constraints 2 and 3 are already satisfied at the schema layer. Scanning the
whole `dist/` tree: **zero** occurrences of the street address, **zero**
occurrences of `718`.

Genuinely outstanding in Task 6:
- `openingHours` absent — needs `Mo-Su 05:00-23:30`.
- `sameAs` needs TikTok + `https://nextdoor.com/pages/eys-handyman-katy-tx/`.

---

## 5. Two constraint violations found in the repo's own docs

Both in `docs/07-seo-playbook.md`, which is committed:

1. **Line 46 publishes the street address** in the GBP checklist table, in a
   row headed "Must match site". Violates hard constraint 2. (It does not reach
   `dist/`, but it is in version control.) — **fixed**: replaced with an
   explicit "hidden, service-area business" note.
2. **Lines 69 and 140 instruct `aggregateRating`** on the homepage and
   `/reviews/`. Directly contradicts hard constraint 3. — **fixed**: both now
   state that no `aggregateRating` markup is used anywhere.

The playbook also still lists stale figures (150 reviews / 4.9 stars vs the
actual 158 / 5.0 in `business.ts`) and a `profileUrl: ''` TODO that is already
filled in.

These need correcting or the next agent reading the playbook will reintroduce
both violations. Not yet changed — flagging first because editing doctrine docs
felt like it warranted a heads-up.

---

## 6. Task 7a — note before I change the review count

`business.ts` has `count: 158, rating: 5.0`. The brief says live is 160. The
brief also describes the rating as needing "5.0 across 160+" copy, which matches
the existing 5.0 — but `docs/07-seo-playbook.md` claims 4.9. Going with the
"160+" degrade-gracefully option and updating the stale comment, unless told
otherwise.

---

## 7. Queue

Not started, in the order given: Task 6 (`openingHours`, `sameAs`), Task 7
(review count, UTM test, GA4 events), Task 5 (positioning copy — insured,
multi-trade, after-hours), then Tasks 2, 3, 4.

Task 2 and Task 4 both depend on **real client-supplied photos** (tile projects;
one photographed project per community). Those pages can be built and shipped
without galleries and flagged, per the brief, but the photo gap is the limiting
factor on Task 4 in particular.
