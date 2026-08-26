# Website work order — GBP alignment & recovery

**For:** Claude Code, running in the `eys` repo
**Date:** August 2026
**Source:** Local-search forensic audit, 24–25 Aug 2026

---

## Read this first

You are working on **eyshandyman.com** — an Astro + Tailwind static site for Elevate Your Space Handyman, a veteran-owned handyman and home-improvement business in Katy, Texas.

Before writing any code, read in this order:

1. `AGENTS.md`
2. `docs/01-product-spec.md`
3. `docs/02-site-architecture.md`
4. `docs/03-design-system.md`
5. `docs/07-seo-playbook.md`
6. `docs/08-legacy-url-redirects.md`

Then produce a short implementation plan and **wait for approval before making changes.** Work in small, reviewable commits. Do not restructure routing broadly. Do not introduce React or any client-rendered core content. Do not add npm packages for anything achievable in plain Astro/Tailwind.

### Context you need in order to make good judgement calls

The Google Business Profile was **suspended twice in 2026** — around March, and again from June through most of July. During the second suspension the street address was hidden, which is the correct and required configuration for a business that serves customers at their homes rather than at its own address. That change appears to have shrunk the profile's Maps ranking radius: it now ranks #1 in Katy but #12 in Cinco Ranch and nowhere in Cypress — the two markets that generate most of the revenue.

**The consequence for this repo: the website is now the only asset that can reach those markets.** Every task below should be weighed against that. Content that helps eyshandyman.com rank in Cinco Ranch, Bridgeland, Cross Creek Ranch and Aliana is worth more right now than almost anything else.

Two more facts that shape the copy:

- **EYS runs multi-trade projects start to finish.** Eyad coordinates his own carpentry with a drywall trade and a licensed electrician and delivers the whole project. A specialist competitor shows up, does one thing and leaves. This is a genuine differentiator and it is currently **not communicated anywhere on the site.**
- **EYS answers the phone 5:00 AM – 11:30 PM, seven days,** and will dispatch same-night for urgent work at a late-hours rate. This is real and is also **not communicated anywhere on the site.**

---

## Hard constraints — do not violate

1. **Never write that EYS is "licensed."** Texas licenses electricians through TDLR; EYS is not a licensed electrical contractor. The word "licensed" may only ever attach to a *subcontractor* — "licensed electricians," "our licensed trade partners." Never "licensed handyman," never "licensed and insured" as a description of EYS. **"Insured" alone is fine and should be used.**
2. **Never publish the street address** anywhere — not in copy, not in schema, not in JSON-LD, not in an image alt, not in a comment that ships. `business.publishAddress` stays `false`. A visible residential address is the single most likely cause of both suspensions.
3. **Never add self-serving `aggregateRating` markup** to the LocalBusiness node. The helper `aggregateRatingFromReviews()` in `src/data/schema.ts` exists but is unused — keep it that way, or delete it.
4. **Do not create thin city or community pages.** Every location page must contain verifiable, specific local detail. If you cannot source real detail for a place, do not create the page.
5. **Phone number is `(346) 820-1629` everywhere.** There is a stray `(718) 986-1177` circulating on third-party sites; it must never appear in this repo.
6. Run `npm run check` and `npm run build` before declaring any task done.

---

## Task 1 — Consolidate competing pages
**Priority: highest. These are actively splitting ranking signals.**

### 1a. `/start/` vs `/`
Both are indexable, both self-canonical, both target "handyman Katy" with near-identical value propositions and FAQs. The homepage is absent from organic page 1 for "handyman katy tx" while three competitor sites rank.

- Determine from the repo and `docs/` whether `/start/` is a paid-traffic landing page.
- **If it is a paid landing page:** add `noindex, follow` to it and remove it from the sitemap.
- **If it is not:** 301 it to `/` and delete the route.
- Either way, `/` must be the single canonical target for the head term.

### 1b. Two curtain pages
- `/curtain-installation/` — has real pricing ("Rod installation from $799. Track installation from $1,199.") and the Jobber booking widget.
- `/services/curtain-installation/` — general service page, no pricing.

The Maps pack for "curtain installation" is owned entirely by blinds retailers, so organic is the *only* route to these leads. Splitting the signal is expensive.

- **Consolidate onto the priced page.** Merge any unique content from the `/services/` version into it.
- 301 `/services/curtain-installation/` → `/curtain-installation/`.
- Update every internal link, the services index, and any nav or cross-link component.

### 1c. Legacy URLs returning 200
`/drywall-repair-katy/`, `/about-us/`, `/kitchen-remodeling-richmond/`, `/floor-and-decor-richmond/`, `/contact-us/` and similar are **live pages with stale titles that self-canonicalise** to the new structure instead of redirecting.

- Check `src/pages/[legacySlug].astro` and `docs/08-legacy-url-redirects.md`.
- Convert all of them to **301 redirects** (Cloudflare `_redirects` file or equivalent for the current deploy setup).
- Remove them from `sitemap-0.xml`.
- Verify no internal link still points at a legacy slug.

---

## Task 2 — Three new service pages
**These directly support GBP categories and services that currently have nothing behind them.**

Follow the existing content-collection pattern in `src/content/services/` and match the structure and depth of the strongest existing page. Each needs: one clear H1, SEO title, meta description, canonical, crawlable body, FAQs, internal links, image alt text, and a CTA to the estimate flow.

### 2a. `/services/tile-installation/`
**Why:** "Tile contractor" is a live GBP category with *no supporting page and no tile project anywhere on the site*. Categories unsupported by site content don't rank.

Cover: backsplash installation, shower and tub tile surrounds, floor tile, accent tile, grout and caulk renewal, transitions and trim. Be honest about scope — this is finish tile work, not slab or structural.

Ask the client for 2–3 real tile project photos before publishing. **Do not use stock imagery.** If no photos exist, publish the page without a gallery and flag it for photos later — but do publish, because the category needs the support.

### 2b. `/services/whole-project-remodeling/`
**Why:** this is EYS's single biggest differentiator and there is no page for it at all.

The pitch, in the client's own framing: *a specialist arrives, does his one thing and leaves. Eyad takes the project from A to Z.* He does his own carpentry and brings in the trades — drywall, licensed electricians — and manages the whole thing so the homeowner deals with one person instead of five.

Structure it around that: what a multi-trade project looks like, who does what, how scheduling and communication work, one written estimate, one point of contact, one walkthrough. Use the media wall as the worked example, since it genuinely involves carpentry + drywall + electrical.

**Wording rules for the electrical portion** — use these constructions:
- "Licensed electricians brought in for regulated electrical work"
- "We bring in our own licensed electrician and manage the schedule"
- "Multi-trade projects run start to finish, including licensed electrical"
- "Our trade partners are licensed and insured"

Never: "we do electrical," "electrical services" as an EYS service, or any construction implying EYS itself performs or is licensed for electrical work.

### 2c. `/services/after-hours-repairs/`
**Why:** EYS genuinely answers 5 AM – 11:30 PM and will come out same-night for urgent work at a late-hours rate. Almost no competitor in Katy is open past 5 PM. This is a real, high-margin service with zero marketing behind it.

Cover: what qualifies as urgent (broken exterior door, security and lock issues, water-adjacent damage, failed lighting, anything that can't wait), how the late-hours rate works, and how to reach EYS after hours. Be straightforward about pricing structure without publishing a hard number unless the client supplies one.

---

## Task 3 — Strengthen the four money pages

These are the highest-margin services and the ones where the Maps pack returns nothing, so the page has to do all the work.

1. **`/services/media-walls/`** — highest ticket in the portfolio. Needs the full treatment: process, materials, what's included, how the TV and wiring are concealed, timeline, price range, and the strongest project photography on the site. Cross-link to the new whole-project page.
2. **`/curtain-installation/`** — already the best-converting page structurally. Keep the pricing prominent. Add the 18-foot / high-ceiling capability explicitly, since eight Google reviews mention it by name and it's a genuine differentiator.
3. **`/services/custom-carpentry/`** — built-ins, under-stair shelving, office built-ins, stair paneling. All are documented projects in `src/content/projects/`. Link them in.
4. **`/services/wallpaper-accent-wall-installation/`** — supports a new GBP category ("Wallpaper installer"). The Katy Maps result for "accent wall installation" returns only four businesses total, so this is a genuinely winnable term. Consider whether accent walls / wall paneling deserve their own page separate from wallpaper — check search demand before splitting.

For each: real photos, FAQs, internal links to the whole-project page, and a clear CTA.

---

## Task 4 — Deepen four community pages
**This is the task that reaches the markets the map pack cannot.**

Target, in priority order:

| Page | Maps rank for "handyman" | Why it matters |
|---|---|---|
| `src/content/communities/cinco-ranch-handyman.md` | #12 | Densest, wealthiest handyman demand in Katy. Client says it's a top revenue source. |
| `src/content/communities/bridgeland-handyman.md` + `towne-lake-handyman.md` | Unranked | Cypress — the other top revenue source, completely invisible in Maps. |
| `src/content/communities/cross-creek-ranch-handyman.md` + `jordan-ranch-handyman.md` | #5 | Fulshear — closest to breaking through. |
| `src/content/communities/aliana-handyman.md` | #10 | Richmond. |

These pages are already **well above the doorway-page threshold** — they carry real acreage figures, resident counts, build-year ranges, median values, named amenities, named HOA and architectural review committees, named builders and correct ZIPs. Do not rewrite them wholesale. The gap is proof, not prose.

For each of the four, add:

- **One real, photographed project completed in that community**, with enough street-level or development-level detail that a neighbour would recognise the context. Ask the client for these — do not invent them and do not reuse the same project across pages.
- **Internal links to the specific service pages** that project touches.
- **A genuine local FAQ** that doesn't appear on the other community pages.

Do **not** create any new community pages until the existing seventeen service-area URLs are producing. Seventeen is already a lot for one crew, and volume is the only doorway-page risk these pages carry.

---

## Task 5 — Trust and positioning copy

### 5a. "Insured" — add it, carefully
There is currently **no insurance or licensing statement anywhere on the site**, which is a notable gap for a contractor. Meanwhile the phrase "Licensed & insured" appears on Google Posts and the Instagram bio, where it is both risky and unverifiable.

Invert that. Add an honest, plain statement to the homepage trust bar and the About page:

> Insured. Veteran-owned. Background-checked through Google.

Confirm with the client that general liability insurance is current before publishing this.

### 5b. Surface the two hidden differentiators
Neither appears anywhere on the site today:

- **A-to-Z multi-trade project management** — add to the homepage hero or the section immediately below it, and to `TrustBar.astro`. Link to the new whole-project page.
- **Evening, weekend and same-night availability** — add to the homepage, the header or sticky CTA, and the contact page. "Open until 11:30 PM, seven days" is a genuine competitive statement against a field that closes at 5 PM.

### 5c. Electrical page — keep the disclaimer, add the positioning
`/services/electrical-services/` currently handles the licensing question well. Its FAQ states plainly: *"No. Elevate Your Space Handyman is not advertising as a licensed electrician or electrical contractor."* **Keep that language exactly as it is** — it is the correct posture and it is well written.

What's missing is the positive half. Add a section explaining that EYS brings in and manages licensed electricians on larger projects, so the customer gets one point of contact. Cross-link to the whole-project page. Use the approved constructions from Task 2b.

Also consider whether this page should be retitled around what it actually offers — fixture and fan installation, coordinated electrical — rather than "Electrical Services," which invites the wrong query and the wrong expectation.

---

## Task 6 — Schema and structured data

Audit `src/data/schema.ts` and `src/components/seo/SchemaJsonLd.astro` against live output. An external fetch of the rendered HTML could not confirm JSON-LD was present — verify with Google's Rich Results Test on the deployed site and fix if it is not emitting.

Required:

- `HomeAndConstructionBusiness` on every page via `BaseLayout`, with `@id`, name, image, url, telephone, email, `priceRange`, `areaServed`, `sameAs`. **`address` limited to locality/region/country. No `streetAddress`. No `geo`.**
- **Add `openingHours`** matching the GBP exactly: `Mo-Su 05:00-23:30`. Currently absent.
- `Service` schema on every service page.
- `FAQPage` wherever real FAQs exist — several pages have FAQ content with no markup.
- `BreadcrumbList` on the deep `/service-areas/{city}/{community}/` hierarchy.
- **No `aggregateRating`.**

Update `sameAs` in `src/data/business.ts` to add:
- TikTok (a Katy/Cypress handyman video there has 11.2K views — a real corroborating signal)
- Nextdoor: `https://nextdoor.com/pages/eys-handyman-katy-tx/`

Independent sources corroborating the same real-world business matter more after a suspension than before one.

---

## Task 7 — Data accuracy and tracking

### 7a. Review count is stale
`src/data/business.ts` has `googleReviews.count = 158`. The live count is **160** and climbing. Either:
- automate it, or
- change the display copy to "5.0 across 160+ Google reviews" so it degrades gracefully.

The comment in that file says "Confirmed from live GBP screenshot 2026-08-04" — whatever you choose, update the comment.

### 7b. UTM handling
`src/utils/utm.ts` already forwards UTMs and click IDs into Jobber via `withAttributionParams` — this is good and should not be broken. The GBP profile links will shortly carry:

- `?utm_source=google&utm_medium=organic&utm_campaign=gbp-profile` → `/`
- `?utm_source=google&utm_medium=organic&utm_campaign=gbp-booking` → `/book/`
- `?utm_source=google&utm_medium=organic&utm_campaign=gbp-post&utm_content=[topic-yyyymm]` → various

Verify these survive the full path into Jobber and that `/book/` handles the booking campaign correctly. Add a test to `src/utils/` if one doesn't cover this.

### 7c. GA4 events
`src/utils/analytics.ts` has a solid named-event scaffold. Verify these actually fire on the new pages: `phone_click`, `estimate_form_open`, `jobber_booking_click`, `lead_submit`, `booking_complete`.

---

## Task 8 — Housekeeping

- **`elevateyourspacehandyman21.jobbersites.com`** ranks for the brand and 404s. Not in this repo — flag it to the client to kill or redirect in the Jobber account.
- Confirm `eyshandyman.com` → `www.eyshandyman.com` canonicalisation is a clean single redirect.
- `robots.txt` blocks AI training crawlers (ClaudeBot, GPTBot, Google-Extended, etc.) while allowing search. Worth a conversation with the client: Google's AI Mode is now a meaningful surface for this business and it currently ranks EYS first there. `Google-Extended` controls Gemini training, not AI Overviews or AI Mode ranking — so the current setting is probably fine, but confirm the client made it deliberately.
- Check `sitemap-0.xml` has `lastmod` dates. It currently doesn't.

---

## Sequencing

1. Task 1 (consolidation) — nothing else compounds until signals stop splitting
2. Task 6 (schema) and Task 7 (data) — quick, mechanical, low risk
3. Task 2 (new pages) — publish as content becomes available
4. Task 5 (trust and positioning copy)
5. Task 3 (money pages)
6. Task 4 (community pages) — ongoing, gated on real project photos

## Definition of done, per task

- `npm run check` clean
- `npm run build` clean
- No new client-side JavaScript beyond progressive enhancement
- Every new page: one H1, unique title and meta description, canonical, internal links in and out, image alt text, working CTA
- Nothing in the diff contains the street address, the 718 number, or the word "licensed" applied to EYS
- A short summary of what changed and what remains
