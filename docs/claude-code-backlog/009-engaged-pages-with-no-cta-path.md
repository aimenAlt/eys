# 009 — Pages people read but can't act on: /pricing/, the gallery viewer, /about/, /services/, /service-areas/

## Decision already made
GA4 page × event matrix, Aug 29–Oct 10 (437 engaged users site-wide). These pages hold attention and produce zero Jobber or phone clicks:

| Page | Users | Engagement | CTA clicks (Jobber + phone) | Why |
|---|---|---|---|---|
| `/pricing/` | 32 | 28 engaged users, 51 engagement events, 26 s avg — the most-engaged non-form page | 0 Jobber, 1 phone | the only estimate button is the shared `CTASection` at the very bottom; the "booking paths" text link to `/book/` is the only mid-page action |
| `/our-work/` | 48 | 17 users opened project cards, 14 paged through photos 128 times | 2 Jobber, 2 `gallery_estimate_clicked` | in `ProjectDialog.astro` the "Request an Estimate" button sits under the photo, caption and thumbnail strip — off-screen on a phone while people swipe |
| `/about/` | 20 | 17 engaged | 0 | no CTA at all |
| `/services/` hub | 17 | 15 engaged | 0 | no CTA at all |
| `/service-areas/` | 15 | 12 engaged | 0 | no CTA at all |

Compare `/book/` (69 users → 11 Jobber clicks, 16%) and the homepage (261 → 33 CTA users, 12.6%): pages with a visible action convert at 10–16% of users. Give these five the same chance. Copy stays as is; this is buttons only.

## Do this (only these files)
1. `/pricing/` (`src/pages/pricing.astro`): directly under `PageHero`, add a two-button row: red "Send photos for a free estimate" → the project-estimate Jobber form 4985623 (`data-booking-type="project_estimate"`, `eys_form=project-estimate`, `data-cta-location="pricing_hero_form"`) and "Call (346) 820-1629" (`tel:3468201629`, `data-cta-location="pricing_hero_call"`). Pass `ctaLocation="pricing_final_cta"` to the existing bottom `CTASection` so the two are distinguishable. Do not add prices; prices only from `src/data/pricing/todoList.ts`, and the page's existing price copy is not touched.
2. Gallery viewer (`src/components/projects/ProjectDialog.astro`): on screens < 640px, render the existing `data-dialog-actions` row directly beneath the photo (before the caption and thumbnails) so "Request an Estimate" is visible without scrolling; on sm+ keep the current order. Add `data-booking-type="project_estimate"` to the estimate link so it also fires `jobber_booking_click` (it currently only fires `gallery_estimate_clicked`). Keep `data-cta-location="project-viewer"`.
3. `/about/`, `/services/`, `/service-areas/` (`src/pages/about.astro`, `src/pages/services/index.astro`, `src/pages/service-areas/index.astro`): add the same two-button row under the page hero, cta_location values `about_hero_form` / `about_hero_call`, `services_hub_hero_form` / `services_hub_hero_call`, `service_areas_hero_form` / `service_areas_hero_call`. Reuse whatever hero CTA pattern 003/004 introduced (`LocalHero` optional props) rather than a new component.
4. If the shared `PageHero` needs optional CTA props to do 1 and 3, add them as optional with no default so no other page changes; diff `dist/` against the previous build and confirm only these pages' HTML changed.

## Hard rules
No "licensed", no HOA mention, phone only (346) 820-1629, review count only via `src/data/business.ts`, no copy rewrite, tracking attributes exactly as named above, never the retired form 2019189.

## Verification
check + build clean; live HTML of the five pages contains the tel: link and the 4985623 link in the hero; at 390px the gallery dialog shows the estimate button without scrolling after opening any project card; GA4 Realtime shows `jobber_booking_click` with the new `cta_location` values.
Measurement Nov 10 2026: `/pricing/` and `/our-work/` each show ≥ 3 Jobber clicks on ≥ 25 users; the other three show > 0.

## Build notes (Claude Code, 26 Oct 2026)
Decisions:
- `PageHero` gained an optional `ctas` prop (no default) that renders the estimate + call row under the description; /pricing/ and /about/ pass it. /services/ and /service-areas/ have their H1 inline (no PageHero), so they carry the same markup inline under the intro paragraph. The buttons copy LocalHero's 003/004 pattern (red "Send photos for a free estimate" → 4985623, outline "Call (346) 820-1629"), and the row carries `data-sticky-hero-cta` so the phone bottom bar appears once it scrolls away (instead of the 600px fallback).
- Gallery viewer: below 640px the dialog body becomes a flex column and the existing `data-dialog-actions` row takes `order-1`, so it sits directly under the photo, before the caption and thumbnails. One DOM; sm+ keeps the original order.
- `data-booking-type="project_estimate"` is in the markup as asked, but the viewer's estimate link points at a different form per project (media wall 5067435, curtains 5061244/5061268, generic 4985623). A fixed `project_estimate` would mislabel the media-wall and curtain clicks, so `project-gallery.ts` keeps the attribute only for generic-form projects and removes it otherwise (booking type then comes from the form id, as before). The link already fired `jobber_booking_click` (every outbound Jobber link does); the item's premise that it only fired `gallery_estimate_clicked` did not hold.
- /pricing/'s bottom CTASection now passes `ctaLocation="pricing_final_cta"`.

Verification (local build): HTML changed on exactly /pricing/, /about/, /services/, /service-areas/ and /our-work/. At 390×844 the hero estimate and call buttons are above the fold on all four pages (bottoms 369–689px), hrefs are 4985623 and tel:3468201629. Opening 18 project cards in the /our-work/ viewer at 390×844: "Request an Estimate" is fully visible without scrolling every time (bottom 515–672px); `data-booking-type` is `project_estimate` on generic-form projects and absent on media-wall and curtain projects. No console errors.

## DONE 2026-10-26 8192ae4
Estimate + call rows live under the hero on /pricing/, /about/, /services/ and /service-areas/; /pricing/'s bottom CTA reports `pricing_final_cta`; the /our-work/ viewer shows "Request an Estimate" right under the photo on phones.
Live-verified with Playwright at 390×844 (no CTA clicked): all eight hero buttons above the fold with 4985623 / tel:3468201629 hrefs; 18 project cards opened in the live viewer, estimate button fully visible without scrolling every time, booking type correct per form; no console errors. GA4 Realtime not checked (would need a live Jobber click). Measurement Nov 10 as the item says.
