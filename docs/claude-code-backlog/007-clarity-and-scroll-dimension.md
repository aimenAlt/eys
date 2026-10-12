# 007 — Add Microsoft Clarity + register scroll_depth percent, so we can see what people do on each page

## Decision already made
GA4 records no image views, no per-element clicks and scroll depth on only five pages, so "which photo or button works" is unanswerable today. Add Microsoft Clarity (free heatmaps + session recordings) behind the SAME production host guard GA4 uses in `src/layouts/BaseLayout.astro` (fires only on www.eyshandyman.com), and extend `scroll_depth` to every service page.

## Do this
1. Aimen creates the Clarity project at clarity.microsoft.com (he owns the account; you do not create accounts). He puts the project id in `src/data/analytics.ts` (or the file where G-9D5MCDT0L1 / AW-16988082106 live) as `clarityProjectId`. If the id is not there yet, add the code path gated on the id being non-empty and ship; it will activate when he adds the id.
2. Load Clarity only when the host guard passes and only when the privacy opt-out (`/privacy/#your-privacy-choices`, GPC) has NOT been set — same rule as the Meta Pixel. Clarity's snippet goes after the GA4 config; the Ads config must stay before the GA4 config (rule in `docs/analytics-events.md`).
3. `src/scripts/scroll-depth.ts`: remove the five-page allowlist so `scroll_depth` fires on every page under `/services/`, `/service-areas/`, `/our-work/`, `/pricing/`, `/book/`, keeping the 25/50/75 milestones and the once-per-milestone rule. Do not change the event or parameter names.
4. Document both in `docs/analytics-events.md` in the same commit.
5. Aimen registers `percent` (event-scoped) as a GA4 custom dimension — note it in the DONE line as his step.

## Verification
check + build clean; on the live site, with devtools, confirm the Clarity request fires on www only, and that `scroll_depth` fires on a service page at 25/50/75. Then Aimen checks Clarity shows a recording within an hour.

## Superseded
Superseded by the full brief of 12 Oct 09:35 (Clarity + section_view + image_click). The "Do this"
steps above were not followed where they differ. What the brief asked for, and what shipped:
- Clarity on the live host only, loaded after the GA4 config (Ads config still first). Explicit
  opt-out never loads it; GPC loads it with `consentv2` ad storage denied. `trackEvent()` mirrors
  every event NAME to Clarity (no params, no `identify`); `phone_click`, `jobber_booking_click`,
  `lead_submit`, `booking_complete` also `upgrade` the recording. Tags: `page_type`,
  `landing_path`, `traffic`. Clarity row + opt-out wording added to `/privacy/`.
- `scroll_depth` on every page via one import in BaseLayout (six per-page imports removed).
- New `section_view` and `image_click` (`src/scripts/attention-analytics.ts`), not key events, not in Ads.
- `docs/analytics-events.md`: Clarity section, new events, and the registered-dimension list
  corrected to the 13 actually registered (`page_path` / `destination_host` are not).

Aimen's steps from the original item were already done: project id `ywlsbg76a7`, `percent`
registered in GA4.

Decisions made along the way:
- No `src/data/analytics.ts` exists — G-9D5MCDT0L1 and AW-16988082106 are inline in BaseLayout —
  so the Clarity id is inline there too.
- `clarity-tags.ts` reuses `currentAttribution()` / `firstLandingPath()` from
  `jobber-attribution.ts` instead of re-parsing `eys_attribution_v1`. A `utm_source` used as the
  `traffic` tag is lowercased and capped at 40 chars.
- `section_index` counts every top-level section in page order, including ones under 120px that
  never fire (e.g. `/start/`'s 54px trust strip is index 2), so indexes stay stable as content loads.
- Hand-set `data-analytics-section` only where the fallback was vague: `hero` (homepage, `/start/`,
  `/van/`, the built-ins LP, `ServiceHero`), `trust_bar` + `service_areas` (homepage components,
  also used by the small-repair homepage variant and the to-do list page), `included_services` +
  `body_content` (service template). Shared CTA components (`InlineEstimateBand`, `CTASection`,
  `LocalAreaCTA`) were left on their heading-derived ids to avoid churning shared components.
- On a page shorter than the viewport, `scroll_depth` now fires 25/50/75 on load (unchanged
  mechanism, newly reachable). Noted in the events doc.

## DONE 2026-10-12 a55efd7 c086ec5 a21022b
Shipped in three code commits plus this docs commit, each pushed to `main` and checked live on
www.eyshandyman.com with curl + headless Playwright: Clarity loads (`clarity.ms/tag/ywlsbg76a7` →
`collect`) on www, not with `eys_privacy_optout=1`, not on eys-48z.pages.dev, and GA4 still sends
page_view. `scroll_depth` 25/50/75 arrived from `/services/ceiling-fan-installation/`.
`section_view` (hero, trust_bar, … with index + page_type) and `image_click`
(`marble-wood-slat`, in_link false; gallery card in_link true alongside `project_card_opened`)
arrived, and `phone_click` / `jobber_booking_click` still fire with their full params.
Still for Aimen: confirm a recording shows up in Clarity within the hour.
