# 004 — Ads landing pages with traffic and zero Jobber clicks

## Decision already made
`/services/repairs-and-maintenance/` (Ads LP for "Repairs & Upgrades": 22 sessions, 0 jobber_booking_click,
0 phone_click) and `/services/handyman-to-do-list/` (sitelink LP: 11 sessions, 0 clicks) get a visible
call + Jobber CTA pair above the fold, same pattern as 003. These are two pages; change only these two.

## Do this
- Read how `src/pages/services/repairs-and-maintenance/` and `src/pages/services/handyman-to-do-list/`
  render their hero and where the first Jobber link currently sits (grep for `getjobber.com`, `tel:`,
  `data-cta-location`). If the first CTA is below the fold on a 390px phone, add a compact CTA row
  directly under the H1: tel: (346) 820-1629 (`data-cta-location="<page>_hero_call"`) + the page's own
  Jobber link (keep its existing `eys_form`/`booking_type`; for the to-do-list page that is the
  to-do-list booking form, price from `src/data/pricing/todoList.ts` only).
- No copy rewrite, no new sections, no shared-component edits.

## Verification
check + build clean; live HTML of both pages contains the tel: link and the Jobber link within the first
hero section; GA4 Realtime (Aimen can check) shows `jobber_booking_click` with the new `cta_location`.
Measurement date Nov 10 2026: both pages must show > 0 Jobber clicks on ≥ 10 sessions.
