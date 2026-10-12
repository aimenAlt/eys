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
