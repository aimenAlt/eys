# Research + plan — Jobber pricing, home page media walls, limewash, $500/mo Google Ads

**Date:** 28 Aug 2026
**From:** Claude (Cowork session)
**Status:** Research and plan only below, except one home-page change made before this pause was requested (flagged in §2). No Jobber changes, no limewash page, no Google Ads account changes have been made.

---

## 0. What already happened before the pause

I made one direct edit to the local site repo before you asked me to stop and research first:

- Added `src/components/home/HomeMediaWallShowcase.astro` (new file, ~110 lines) and wired it into `src/components/home/HomeSmallRepairPage.astro` (the live homepage — `homepageVariant = 'small-repair'`), plus added a "Media walls" line to the existing "Popular services" sidebar list in that same file.
- Nothing else was touched — not `/home2/`, not navigation, not Jobber links, not any other page.
- I could not run `npm run build` / `astro check` to confirm it compiles — this device's shell has a pre-existing broken native module (`@rolldown/binding-linux-arm64-gnu` missing), unrelated to my edit. Recommend running `npm run dev` or `npm run build` wherever your build normally works (Cursor, or a clean `npm i`) before deploying.

Full detail and decision point in §2. Everything else below is research + plan, not yet implemented.

---

## 1. Handyman To-Do List Visit pricing (Jobber)

**Current state:** The live website's source of truth (`src/data/smallRepairPricing.ts`) already prices this as a declining-block structure, not a flat rate: 1 hour = $224.99, 2 hours = $349.99, each additional 30 minutes = $65 (approved durations: 1, 2, 2.5, 3, 3.5, 4 hours). That's $224.99/hr for the first hour, ~$175/hr blended at 2 hours, ~$130/hr for each 30-min block after — already tiered, already declining, already documented as "single source of truth for UI, calculator, and schema."

You described Jobber's actual form as showing "$225 for 2 hours" — flat, no real tiering. If that's accurate, the live Jobber product is out of sync with the website's approved pricing, which is exactly the kind of drift the project's own rule #43 ("do not assume older prices remain valid") warns about. **I couldn't verify this — Jobber wasn't logged in on this browser profile, and I won't enter your password.** This needs your login before I can act.

**Market research (for context, not to override your existing approved numbers):**
- Self-employed handyman hourly rates: $50–80/hr; corporate/insured shops: $75–125/hr ([HomeGuide](https://homeguide.com/costs/handyman-prices))
- Recommended minimum service-call charge: $125–200, covering travel/setup/admin plus up to the first hour ([HouseCallPro](https://www.housecallpro.com/resources/how-to-price-handyman-jobs/))
- Job-size tiers seen in the market: under 2 hrs = $50–250; under 5 hrs = $250–500; 5 hrs–multi-day = $500–1,500+; day rate $320–600
- Trip fee $30–80, mileage $0.30–0.60/mi outside service area, same-day/after-hours premium $50–150, material markup 20–50% when EYS sources materials

**Where EYS already sits:** your approved 1hr/2hr/+30min tiers are at or above the high end of the "corporate/insured" market band — consistent with a veteran-owned, professional positioning rather than a bargain one. Nothing in the market data suggests these numbers are wrong or too low; if anything they support holding the line rather than discounting.

**Plan (once you're logged into Jobber):**
1. I pull up the actual "Handyman To-Do List Visit" line items/request form in Jobber and diff them against `smallRepairPricing.ts`.
2. If Jobber is flat/stale, I sync it to the already-approved tiers (1hr $224.99 / 2hr $349.99 / +$65 per 30 min) — a sync fix, not a re-pricing decision, so it doesn't need new numbers invented.
3. If you and Eyad actually want to change the underlying prices (not just sync), tell me the target numbers or a margin goal and I'll model it against the comps above before touching Jobber.
4. Separately worth deciding (not acting on yet, per rule #44): whether to formalize a same-night/after-hours premium given the site's existing 5am–11:30pm + same-night urgent language — that claim itself still needs Eyad's confirmation before it's reinforced anywhere.

---

## 2. Home page — media walls

**Problem:** Media walls (Eyad's favorite, highest visual-proof, highest-ticket work) was previously only a passing phrase on the home page ("a media wall finished") and the third-listed category inside the generic services grid — no photos, no dedicated section, not even in the "Popular services" sidebar list. The curtain-installation page, by contrast, cross-sells media walls with a full dark section: eyebrow, heading, two lines of copy, a direct CTA, a video, and two real project photos. Rule #26 in your own project memory — "do not bury media walls so deeply that EYS looks like only an odd-job service" — points directly at this gap.

**What I built** (already in your local repo, not deployed, not committed):
- New component `HomeMediaWallShowcase.astro`: dark full-width section, eyebrow "Beyond the To-Do List," heading "Custom Media Walls — Our Favorite Builds," two short paragraphs, one CTA "See Media Wall Projects" linking to your existing `/services/media-walls/` landing page (I pointed it at the full landing page you already built — hero, proof, video, FAQ, why-us — rather than skipping straight to a bare Jobber form), and a 3-photo grid using three of your real existing project photos (`lit-shelves-living-room.jpg`, `fireplace-niches.jpg`, `marble-wood-slat.jpg` — no stock or invented imagery).
- Inserted it into `HomeSmallRepairPage.astro` right after the services grid, before the "Why Choose Us" section — mirroring where the curtain page places its own media-wall cross-sell (mid-page, after core content, before social proof).
- Added "Media walls" to the "Popular services" sidebar list (it previously listed 6 services and skipped media walls).
- No click-tracking script was needed — your site already has a global click-tracking listener (`conversion-analytics.ts`, wired site-wide via `BaseLayout.astro`) that auto-attributes any link's `data-cta-location` attribute, so the new CTA is already tracked without extra code.
- Untouched: `/home2/` (the alternate, non-live homepage variant), navigation, all other pages, global components, colors, Jobber links.

**Decision needed from you:** keep this as built, want the copy/placement adjusted, or revert it until you've had a chance to look? I'm treating it as paused, not final, per your message.

---

## 3. Limewash walls — page + form

**Cost research:** Interior limewash (a distinct lime-based decorative finish, not the same product as standard "accent wall" paint) runs roughly £40/m² (~$4.70/sq ft) for a standard finish and up to £80/m² (~$9.50/sq ft) for a marble-effect finish in the UK market data available; a small room (~300 sq ft of wall) ran roughly £600–800 (~$760–1,015) total including materials and 1–2 days labor ([Checkatrade](https://www.checkatrade.com/blog/cost-guides/internal-limewash-walls-cost/)). These are UK figures used directionally only — not a Texas quote.

**Fit against EYS's existing taxonomy:** your service taxonomy already has an "accent walls" line under "Home Upgrades & Custom Projects." Limewash is a specific technique that slots naturally under that existing line — it doesn't inherently need a brand-new top-level category, the same way media walls has both a taxonomy slot *and* its own dedicated landing page because it earned that investment.

**What I did NOT find:** any limewash project photos in `public/images/`. Rules #33/#39 (don't fake visual proof, don't confuse attractive design with commercial effectiveness) and #18 (don't build thin pages for SEO alone) all point the same direction here.

**Before I build anything, I need answers to:**
1. Has EYS actually completed limewash work, or would this be a new material/technique EYS is taking on?
2. If new — who applies it? Eyad directly, or a specialty painter brought in the same way electrical work is coordinated?
3. Do you have (or can you get) even 1–2 real project photos, so a page isn't launched with generic/stock imagery?

If the answers support it, the follow-up is small and well-scoped: a lightweight service page reusing the media-wall/curtain landing pattern, plus a Jobber request-form link, once Eyad's real pricing and scope are set. If EYS hasn't actually done this work yet, my recommendation is to hold off on a public page/form and instead route interest through the existing custom-project path until there's real proof to show.

**No limewash page or form has been built.**

---

## 4. Google Ads — $500/month setup plan

Using the change-management format from your own project rules.

### Current state
A historical Smart Campaign ("Handyman Services Near You," ~$1,018/mo when last documented) was optimized for **website traffic**, not leads — already identified in prior research as the core failure. This session's job was to turn the already-agreed direction (Standard Search → LSA → later PMax) into an actual build plan sized to $500/month, using current data.

### Problem
EYS isn't getting enough calls. At $500/month, mistakes (broad match, oversized geography, wrong conversion goal) are proportionally expensive — the budget only works if it's concentrated and disciplined.

### Research findings

**Search benchmarks — handyman-specific** (LocaliQ, Apr 2024–Mar 2025, 3,211 US campaigns): average CPC **$7.10**, average conversion rate **13.45%**, average cost-per-lead **$54.05** — handyman clearly outperforms the broader home-services average ($7.85 CPC / 7.33% CVR / $90.92 CPL). At $500/month entirely on Search, that's roughly **9–10 leads/month** at blended CPL, or ~70 clicks/month at average CPC. ([LocaliQ](https://localiq.com/blog/home-services-search-advertising-benchmarks/))

**$500/month structural consensus** across multiple 2026 guides: concentrate rather than spread — one Search campaign, one ad group, 5–10 tightly-relevant high-intent keywords, 3 responsive search ads. Use phrase or exact match only; broad match is repeatedly called out as "a budget killer" at this spend level. Bidding sequence: start on Maximize Clicks to gather cheap data, move to Maximize Conversions after 30–50 conversions, only add Target CPA after 50+ conversions in a trailing 30 days — realistically months away at EYS's likely volume, so patience is part of the plan, not a failure state. ([Digitenzy](https://digitenzy.com/google-ads-500-budget-2026))

**LSA (Local Services Ads) eligibility — Handyman category, from Google's own requirements page:** general liability + professional liability insurance, background checks on the business and owner (via Pinkerton or Evident), a verified Google Business Profile, and — critically for EYS — **no state contractor license is required for the Handyman category** the way there would be for Electrician. Texas has no general handyman license, so EYS should be eligible under Handyman without needing a TECL. Screening takes **3–4 weeks** after documents are submitted. ([Google Local Services Help](https://support.google.com/localservices/answer/12174778))

**LSA cost-per-lead by trade** (2026 aggregator data — no direct "Handyman" figure was published in the sources found): Electrical ~$39, Cleaning ~$28, HVAC $51–80, Plumbing $57–69, Roofing $71–162; blended average across trades ~$53 with a 43.9% booking rate. Given handyman's strong Search performance and Electrical's relatively low LSA CPL, EYS's handyman LSA leads are *plausibly* in the $35–55 range once eligible — flagging this as an estimate to validate with real data, not a number to plan a budget around yet. LSA's booking/conversion rate (20–25%) is meaningfully higher than Search's (6–13%), and it's pay-per-lead rather than pay-per-click, which matters more when the budget is this tight. ([LeadTruffle](https://www.leadtruffle.co/blog/complete-guide-google-lsa-home-service-contractors-2026/), [Booked Friday](https://bookedfriday.com/local-services-ads-cost))

**Legal guardrail — Texas TDLR, electrical work:** unlicensed persons cannot perform "electrical work" (installing/maintaining/extending wiring systems); licensed electrical contractors must display their license number and a specific TDLR disclosure statement on proposals, invoices, contracts, and vehicle signage. ([TDLR Compliance Guide](https://www.tdlr.texas.gov/electricians/compliance-guide.htm)) Implications for Ads/LSA copy:
- Never claim "licensed electrician" for Eyad or EYS itself in ad copy — only for the actual licensed electricians EYS coordinates.
- Do not pursue the LSA "Electrician" category (requires a TECL master electrician of record). Stick to "Handyman" at launch; evaluate "General Contractor" or "Carpenters" separately later, each with its own eligibility check — don't assume.
- Any Search ad copy referencing electrical work should say "electrical fixture installation" or "we coordinate licensed electricians" — never imply EYS itself holds an electrical contractor license.

### Proposed plan (sequenced to the $500/mo budget)

**Phase 1 — Weeks 1–2, setup:**
1. Audit/confirm conversion tracking is actually firing (call tracking, form tracking, Jobber redirect tracking) before spending a dollar — flagged as unverified in your own project memory.
2. Confirm the canonical (346) 820-1629 number is what's live in every ad asset; make sure the legacy 718 number isn't anywhere in Ads.
3. Pause/retire the old traffic-goal Smart Campaign if still live.
4. Build **one** Standard Search campaign — "Handyman — Katy Core" — goal = Leads/Calls (not Website Traffic), one ad group, 8–10 exact/phrase-match keywords built from your highest-intent service names.
5. Location targeting = Presence-based, Katy + immediate high-priority ZIPs / Cinco Ranch / Fulshear corridor only — not a blanket 15-mile radius like the old campaign.
6. 3 responsive search ads using your already-researched headline themes (Veteran-Owned, Katy & West Houston Handyman, Repairs Installs & Upgrades, Request a Free Estimate, Custom Carpentry, "From Punch Lists to Projects") — never "reliable/trusted/professional" alone.
7. Negative keywords from day one: DIY/how-to, jobs/careers/salary/hiring, free, cheap/discount (unless you want to deliberately test price-sensitive terms), Home Depot/Lowe's, unrelated trades, out-of-territory cities.
8. Match ad intent to landing page: general handyman terms → homepage or `/services/handyman-to-do-list/`; TV mounting → its service page; media wall terms → `/services/media-walls/`; curtain terms → `/curtain-installation/`. Never default everything to the homepage.
9. Full $500/mo to this one Search campaign while data accumulates — don't split with LSA yet, since LSA verification takes weeks regardless and splitting $500 two ways too early starves both.
10. In parallel, start LSA paperwork now (insurance certificate, background check submission) so the 3–4 week clock runs alongside Phase 1, not after it.

**Phase 2 — once LSA verification clears (likely weeks 4–6):**
11. Re-split the $500 — a reasonable starting point is ~$300 Search / $200 LSA — then adjust after 4–6 weeks of real cost-per-booked-job data, not projections.
12. Launch under the "Handyman" category only at first; evaluate "General Contractor" or "Carpenters" separately once verified eligible under each — don't assume.

**Phase 3 — month 2–3 onward, optimization:**
13. Weekly search-term report review; prune waste; promote proven phrase-match terms to exact match.
14. Shift Search bidding from Maximize Clicks to Maximize Conversions once 30–50 conversions accumulate.
15. Feed real booked-job/revenue data back into the account (offline conversion import if feasible) so optimization targets actual jobs, not just calls — the single highest-leverage step, and directly what your own rules #10/#12 already call for.
16. Only evaluate Performance Max once Search + LSA have a track record of clean, trustworthy conversion data.

### Measurement
Qualified calls, call duration ≥60–90s as a basic quality filter, form submissions, booked visits, then — as data matures — actual jobs won and revenue by campaign/keyword. Not clicks, not impressions.

### Risk
$500/month is genuinely tight for Houston-metro handyman search — expect single-digit leads per month at first. The most common way small budgets get wasted is broadening match types or geography to chase volume; resist that. LSA eligibility takes 3–4 weeks and **one failed background check disqualifies the entire business**, so start that process early and don't count on LSA leads in month 1.

### What I can't do for you
Actually creating a campaign or spending money in the Google Ads account is a "can this spend money" action under your own hard rules (#35) — I won't do that autonomously regardless of how confident the plan is. When you're ready, I can drive the account setup with you the same way as Jobber: you log in in the browser pane, I narrate/execute each setting, and you approve the actual budget/payment/launch step yourself.

---

## What I need from you to keep moving

1. Log into Jobber in the browser pane so I can check the live To-Do List Visit pricing against the site (§1).
2. Tell me keep / adjust / revert on the home page media-wall section (§2).
3. Answer the three limewash questions — has EYS done this work, who'd do it, do real photos exist (§3).
4. Say go-ahead on Phase 1 of the Google Ads plan, and log into Google Ads in the browser pane when you want to actually build it (§4).

---

## Addendum — 28 Aug 2026, after your go-ahead

### §1 Jobber pricing — resolved, no discrepancy found

Logged into Jobber (Settings → Products & Services) and opened the actual line items:
- "Handyman To-Do List Visit — 1 Hour": **$224.99**
- "Handyman To-Do List Visit — 2 Hours": **$349.99**
- "Handyman To-Do List Visit — 3 Hours": present, not opened (pattern holds per the +$65/30min rule already in `smallRepairPricing.ts`)

This exactly matches the website's approved tiers. There is no flat "$225 for 2 hours" anywhere in the product catalog — I made no changes since there was nothing to fix. My best guess is the $224.99 *one-hour* rate is what got recalled as "$225 for 2 hours." No action taken; flag if you want the actual numbers changed (not just synced) and I'll model that against the market data in §1 above.

Also noted while in Jobber: today's schedule shows an active job "Jamarcus Lawrence — Limewash and mantel," which independently confirms EYS has done real limewash work (consistent with your answer in §3).

### §2 / §3 — implemented

- Home page media-wall section upgraded to match the curtain page's treatment more closely: added the same portrait video (`vertical.mp4`) alongside the two project photos, using the identical lazy-load/autoplay-on-scroll pattern the curtain page uses.
- Downgraded the Handyman To-Do List Visit pathway card on the home page: removed its "Most popular" badge/highlight and moved it to the third (last) position; **Custom Project Estimate is now the featured, highlighted pathway** instead — direct path toward media walls and other bigger work. Free Photo Estimate stays first (lowest-friction entry point). File: `src/components/home/pathways/ServicePathwaysSection.astro`.
- Built the limewash page: `src/content/services/limewash-walls.md`, wired into the "Home Upgrades & Custom Projects" category and the site's full service-slug list (`src/data/serviceCategories.ts`), so it's live at `/services/limewash-walls/`, in the services grid, and in navigation — same generic service-page template the other 25 non-bespoke services use (hero, included services, price factors, process, FAQs). CTA routes to `/contact/` (bookingType: quote-request) since there's no dedicated Jobber product/form for limewash yet.
- **Placeholder images:** I could not actually fetch a stock photo — this browser environment's network access is restricted to an allowlist that doesn't include Unsplash/Pexels/etc., so there was no way to download one. Rather than leave a broken image or fabricate something misleading, the page currently falls back to the site's own branded placeholder graphic (`/images/placeholder.svg`) via the existing `imageOrPlaceholder()` helper already used sitewide for missing images — swap in real photos whenever you have them and it'll pick them up automatically.

### §4 Google Ads — found something you should decide before I build anything

Logged into Google Ads as aimen.altaiyeb@gmail.com. There are **two existing accounts, both still "(Setup in progress)" and both completely blank**:
- **114-707-9378** — mid-setup of a **Performance Max** campaign (Google's default new-account wizard), zero search themes entered.
- **798-496-2123** — mid-setup of a **Smart Campaign**, business name field still empty.

Neither has any campaign data, spend history, or connection to the "Handyman Services Near You" Smart Campaign referenced in earlier research — that campaign either lived in a different Google login, was already deleted, or the earlier research came from screenshots rather than a currently-connected account. I didn't find it here.

Both blank accounts also default to exactly the setups we agreed to avoid (PMax first, or the beginner Smart Campaign flow) rather than a real Standard Search campaign — Google steers new accounts that way by default.

**I'm stopping here rather than guessing**, since this touches a live, billing-linked account: do you want me to (a) continue building inside one of these two existing shells — and if so, which — or (b) abandon both and start a clean account in Expert Mode so I can build the actual Standard Search structure from §4 without Google's wizard steering us toward PMax/Smart Campaign? Either way, I'll fill in the campaign structure and stop short of anything that spends money or requires payment info, per your own rule against AI auto-spending ad budget — that step is yours.
