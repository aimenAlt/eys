# 006 — Refresh the data section of `Claude outputs/eys-seo-dominance-stage1-prompt.md`

## Decision already made
Update IN PLACE (never fork) the data/current-state section of the living master prompt with the Oct 11
2026 digest numbers, and bump its Last updated / Changelog header. Untracked folder — no commit.

## Numbers to put in (Aug 29–Oct 10 2026, Search Console sc-domain:eyshandyman.com)
- Indexed 60 / not indexed 119 (Oct 9). Discovered-not-indexed 27 (was 34). Redirect error 37 (new, apex host — see 001).
  Sitemap 87 URLs, last read Oct 5. External links 7 from 5 scraped directories (link constraint unchanged).
- Non-brand CTR 0.25% (was 0.26% Sep 13). Brand 21 clicks @ 17.4% CTR. ZIP-string noise 1,606 impr (30%).
- `handyman katy` pos 12.75 (was 16.35) · `handyman katy tx` pos 5.42, 3 clicks (was 15.8) · `katy handyman` 29.8 ·
  `carpentry katy` 6.7 (10 impr) · `handyman near me` 11.3 · electrical queries collapsed to 104 impr (legacy URL dropped out;
  `/services/electrical-services/` indexed, crawled Oct 5, 17 impr).
- Weekly clicks still 6–20; last 28d 20 clicks vs 31 prior (impressions 3,700 vs 2,618).
- On Google: electrical-services, service-areas/katy, service-areas, custom-carpentry, handyman-to-do-list,
  service-areas/fulshear, media-walls, book. Not: `/services/`, `/services/tv-mounting/`.
- Jobber ground truth (77 real requests in 43 days): TikTok 17, Google Maps 13, ChatGPT 6, Google Ads 4, LSA 4.
Everything else in the prompt stays as it is.

## Not done — needs the Mac (Claude Code, 2026-10-12)
`Claude outputs/eys-seo-dominance-stage1-prompt.md` is untracked and lives only on Aimen's Mac.
The cloud session's clone does not have it, and the item forbids committing it, so there is
nothing here to edit in place. Run this item from a local Claude Code / Cowork session on the
Mac; every number it needs is quoted above. One addition for that edit: the "Redirect error 37"
line can say the fix is a Cloudflare Single Redirect that Aimen sets up (see 001 → "Needs Aimen
in Cloudflare").
