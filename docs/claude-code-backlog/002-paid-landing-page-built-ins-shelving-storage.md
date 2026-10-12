# 002 — Paid landing page: built-ins, shelving & storage

## Decision already made
Build ONE new noindex paid landing page at `/lp/built-ins-shelving-storage/` for the Google Ads ad group
"Built-Ins, Shelving & Storage" (campaign 24242755343). Until it is live the ads point at
`/services/custom-carpentry/` — do not change that page. This is NOT a new indexed service page
(rule: no thin pages for SEO; `/services/custom-carpentry/` stays the organic page for this demand).

## Why (data, Aug 29–Oct 10 2026)
- Paid Google leads arrive by PHONE: all 3 Jobber leads tagged "Google – Sponsored Ad" were phone calls;
  `phone_click` 7 and `Calls from ads` 2 vs `generate_lead` 1 for paid sessions. The page must lead with the call.
- The best-performing terms in the Media Walls campaign were built-ins/shelving, not "media wall":
  "custom built in shelving", "built in shelves for bedroom", "accent wall contractors near me",
  "custom built ins"; Jobber shows the same (laundry built-ins, under-stair shelving, office shelving).
- `/start/` (current paid LP) sends 4.4% of sessions into Jobber vs 11.5% from the homepage.

## Build spec
- Route: `src/pages/lp/built-ins-shelving-storage.astro` (or the pattern the repo already uses for
  `/start/` — reuse `/start/`'s layout/components rather than inventing a new one; `/start/` is the
  reference for noindex handling, `follow`, canonical to self, and GA4 `page_type`).
- `<meta name="robots" content="noindex,follow">`, self-canonical, NOT in the sitemap (check the sitemap
  filter in `astro.config.mjs` excludes `/lp/` the same way it excludes `/start/`).
- Above the fold on a 390×844 phone: H1 "Built-In Shelving & Storage, Built to Your Wall", one line
  "Closet, pantry, laundry, mudroom and garage storage. Site-built in Katy & Fulshear homes.", then TWO
  buttons: **Call (346) 820-1629** (tel: link, `data-cta-location="lp_hero_call"`, fires `phone_click`)
  and **Send photos for a written estimate** → Jobber project-estimate form via the existing sitewide
  `jobber.projectEstimateFormUrl` helper with `eys_form`/`eys_lp` params (`data-cta-location="lp_hero_form"`,
  fires `jobber_booking_click`, `booking_type=project_estimate`). Sticky mobile call bar like the homepage.
- Then: 4–6 real project photos from `/our-work/` tagged carpentry/built-ins (navy office built-ins,
  understair curved shelving, window-seat hutch, garage overhead storage — use what exists in
  `src/content/projects/` or the gallery data; no stock images), one review from `src/content/reviews/`
  about carpentry/built-ins, a 5-line "what we build" list (built-in shelving & bookcases · closet, pantry
  & linen systems · laundry and mudroom built-ins, benches & lockers · garage overhead racks & wall
  storage · floating shelves anchored into studs), a 3-step "how it works" (send photos → one written
  estimate → built on site), and the review count/rating ONLY via `googleReviewCountDisplay()` /
  `googleReviews.rating` from `src/data/business.ts`.
- Trust line: "Veteran-owned · Insured". Nothing about licenses, guarantees, hours, superlatives.
- Town naming per rule. No HOA mention anywhere. No prices on this page (built-ins are quoted).
- GA4: `page_type` = `lp_landing` (add to the page_type vocabulary where `start_landing` is defined), and
  the CTAs above must register in the existing `jobber_booking_click` / `phone_click` plumbing with
  `cta_location` values set — verify by reading `src/scripts/` tracking code, not by assumption.
- Performance: no new fonts, no new JS beyond what `/start/` loads; images via the existing image
  component with explicit width/height.

## Verification
`npm run check` + `npm run build` clean; after deploy `curl -sI https://www.eyshandyman.com/lp/built-ins-shelving-storage/`
is 200 with the noindex header/meta; the page is NOT in `dist/sitemap-0.xml`; on the live page both CTAs exist,
the tel: link is the right number, and the Jobber link carries `eys_form`/`eys_lp`. Then write the final URL
in the DONE line so the Ads final URL can be switched (that switch is done in Google Ads, not here).
