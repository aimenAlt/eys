# 003 — `/start/`: make the paid landing page phone-first, measured against the homepage

## Decision already made
Keep `/start/` as the Core Handyman ads landing page (it is also the print-QR page; both audiences want
the same thing), but put a CALL button and the Jobber button side by side above the fold, and move the
chooser below. Smallest change that achieves it; no redesign.

## Evidence
- Aug 29–Oct 10: `/start` 136 sessions → 6 `jobber_booking_click` (4.4%), 0 `generate_lead`.
  Homepage 338 sessions → 39 clicks (11.5%), 9 `generate_lead`. Paid leads are phone calls (see 002).
- Mobile is 495 of 743 users and the only device that completes the funnel.

## Do this
- In the `/start/` hero: primary = tel: (346) 820-1629 with `data-cta-location="start_hero_call"`;
  secondary = the existing Jobber estimate link (keep its `eys_form`, `booking_type` and
  `data-cta-location`). Keep the To-Do List pricing block, pulling prices only from
  `src/data/pricing/todoList.ts`. Keep noindex. Do not touch `/van/` or `/go/`.
- Make sure the sticky mobile bar on `/start/` has the call button (it exists on the homepage as
  `sticky_mobile`/`mobile_sticky` — reuse that component as-is).

## Verification
check + build clean; live page shows both buttons above the fold at 390px wide (use the existing
screenshot/QA tooling if the repo has it, otherwise curl the HTML and assert both hrefs exist and the
noindex meta is still present). Measurement date: Nov 10 2026 — `/start` jobber_booking_click rate and
phone_click count vs the Oct 11 baseline above.

## Decisions (Claude Code, 2026-10-12)
- Hero: red **Call (346) 820-1629** (`start_hero_call`) and **Get a Free Quote** side by side. The
  quote button is the same `/start/` project-estimate link (form 5201775,
  `eys_form=project-estimate-start`, `booking_type=project_estimate_start`, `hero_offer_quote`);
  it replaces the old "Any Project" tile. The To-Do List tile (From $175, from `todoList.ts`, still
  `hero_offer_todo`) stays under the pair. "Choose a Project" became a small text link under it
  ("See every project type ↓"); the chooser section itself is unchanged.
- `StartStickyBar` already had the call button (`sticky_mobile`) and was not changed. Its reveal
  hook `data-start-hero-cta` moved onto the new button row.
- Header left unchanged (Call + Choose a Project), so the change stays small.
- Live curl blocked from the cloud session (see 002). Verified on the build output: noindex meta
  present; at 390×844 both buttons sit side by side with bottom edge at 367px; Deploy Cloudflare
  run 136 succeeded.

## DONE 2026-10-12 a22319c
/start/ hero is phone-first. Measure on Nov 10 2026 against the Oct 11 baseline (4.4%
jobber_booking_click, 0 generate_lead).
