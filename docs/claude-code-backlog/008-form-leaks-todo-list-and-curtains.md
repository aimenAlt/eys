# 008 — Fix the two form leaks: to-do list booking (18 opens → 0) and high-ceiling curtains (13 → 0)

## Decision already made
GA4 Aug 29–Oct 10: Jobber booking form 4983259 (to-do list) had 18 opens, 12 s average engagement, 0 submissions; curtain form 5061244 had 13 opens, 0 submissions. Meanwhile the simple project-estimate form 4985623 converts 25% and Eyad's phone-lead form 44%. The slot-booking step is the leak. Change the PRIMARY CTA on these pages to the simple request path + Call; keep the calendar booking as a secondary link.

## Pages (only these)
- `/services/handyman-to-do-list/` (`src/pages/services/handyman-to-do-list/`): primary = "Send your list, get a time" → Jobber request form 4985623 with `data-booking-type="project_estimate"` and `eys_form=todo-list-request`, `data-cta-location="todo_hero_request"`; beside it tel: (346) 820-1629 (`todo_hero_call`). Secondary text link "Prefer to pick a slot? Book a 1- or 2-hour visit" → the existing 4983259 link (keep its tracking). Prices unchanged, from `src/data/pricing/todoList.ts`.
- `/curtain-installation/` and `/services/curtain-installation/`: primary = "Send photos of your windows" → form 4985623 with `eys_form=curtains-request`, `data-cta-location="curtain_hero_request"`, plus Call; secondary = the existing high-ceiling form 5061244 link (keep `InitiateCheckout` Meta event and `curtain-attribution.ts` behaviour on that secondary link).
- Do not touch /go/ pages, /van/, or the homepage.

## Verification
check + build clean; live pages show the new primary buttons above the fold at 390px; the Jobber links carry `_gl` after mousedown (cross-domain linker) and the `eys_form` param; GA4 Realtime shows `jobber_booking_click` with the new `cta_location` values. Measurement Nov 10: to-do-list page key events > 0 on ≥ 20 views.
