# 008 — Fix the two form leaks: to-do list booking (18 opens → 0) and high-ceiling curtains (13 → 0)

## Decision already made
GA4 Aug 29–Oct 10: Jobber booking form 4983259 (to-do list) had 18 opens, 12 s average engagement, 0 submissions; curtain form 5061244 had 13 opens, 0 submissions. Meanwhile the simple project-estimate form 4985623 converts 25% and Eyad's phone-lead form 44%. The slot-booking step is the leak. Change the PRIMARY CTA on these pages to the simple request path + Call; keep the calendar booking as a secondary link.

## Pages (only these)
- `/services/handyman-to-do-list/` (`src/pages/services/handyman-to-do-list/`): primary = "Send your list, get a time" → Jobber request form 4985623 with `data-booking-type="project_estimate"` and `eys_form=todo-list-request`, `data-cta-location="todo_hero_request"`; beside it tel: (346) 820-1629 (`todo_hero_call`). Secondary text link "Prefer to pick a slot? Book a 1- or 2-hour visit" → the existing 4983259 link (keep its tracking). Prices unchanged, from `src/data/pricing/todoList.ts`.
- `/curtain-installation/` and `/services/curtain-installation/`: primary = "Send photos of your windows" → form 4985623 with `eys_form=curtains-request`, `data-cta-location="curtain_hero_request"`, plus Call; secondary = the existing high-ceiling form 5061244 link (keep `InitiateCheckout` Meta event and `curtain-attribution.ts` behaviour on that secondary link).
- Do not touch /go/ pages, /van/, or the homepage.

## Verification
check + build clean; live pages show the new primary buttons above the fold at 390px; the Jobber links carry `_gl` after mousedown (cross-domain linker) and the `eys_form` param; GA4 Realtime shows `jobber_booking_click` with the new `cta_location` values. Measurement Nov 10: to-do-list page key events > 0 on ≥ 20 views.

## Build notes (Claude Code, 26 Oct 2026)
Worked after 011–015 (the homepage was not touched, as the item says).

Decisions:
- `src/data/requestFirstCtas.ts`: `projectEstimateRequestUrl('todo-list-request' | 'curtains-request')` stamps the item's `eys_form` on the shared form 4985623; `requestFirstServiceHero` opts ServiceHero into the request-first hero by slug (only `curtain-installation`), so the other 24 service pages render byte-identical `<main>`.
- To-do page: red "Send your list, get a time" (`todo_hero_request`) beside an outline Call; "Prefer to pick a slot? Book a 1- or 2-hour visit (from $175)" is the existing 4983259 link with its tracking unchanged (`handyman_to_do_list_hero_form`).
- **Call placement name kept as `handyman_to_do_list_hero_call`**, not the item's `todo_hero_call`: backlog 004 shipped that value on 12 Oct and its Nov 10 re-measure reads it, so renaming would split one placement across two strings. The new request button uses the item's `todo_hero_request`.
- /curtain-installation/: red "Send photos of your windows" (`curtain_hero_request`) + white-outline Call (`curtain_hero_call`); the calendar booking is now the inline "See Available Times & Book" CurtainBookLink in the hero (still `data-curtain-cta="high_ceiling"`, so curtain-attribution.ts fires `InitiateCheckout`).
- /services/curtain-installation/: its hero primary used to go to /contact/; it is now the curtain request form (`curtain_hero_request`), with Call unchanged and a new secondary link to the high-ceiling booking form 5061244 (`service_hero_booking`, InitiateCheckout-wired).
- Only the heroes changed. The curtain landing's header "Book Installation", sticky "Book" and the offer/gallery/process/final booking buttons still go to 5061244 — the item scopes the change to the primary hero CTA; worth re-measuring before moving those too.

Verification (local build): `<main>` changed on exactly these three pages out of 114; at 390×844 the new primary buttons and Call are above the fold (to-do 670px, curtain landing 736/800px, curtain service 489px); hrefs carry `eys_form=todo-list-request` / `curtains-request`, `data-booking-type="project_estimate"`; no console errors. The `_gl` linker param and GA4 Realtime check need a click on a live Jobber link, which counts as a Google Ads conversion, so they were not done; the linker config (`BaseLayout`) is unchanged and these are ordinary outbound Jobber links like the ones it already decorates.
