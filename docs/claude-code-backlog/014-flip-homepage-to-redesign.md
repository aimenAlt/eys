# 014: Put the redesigned homepage live at "/"

## Gate (check first; if it fails, stop and mark this item BLOCKED)
Item 013 is DONE, and every one of 013's checks passes on the LIVE /home2/ today. Re-run the Playwright checks against https://www.eyshandyman.com/home2/, clicking nothing.

## Decision already made
"/" renders the approved redesign (item 013) with the new chrome and `theme={siteTheme}` (blue). This is the live homepage that Ads and organic traffic land on, so this item is only the switch and its docs, nothing else.

## Do this
1. `homepageVariant = 'redesign'` in `src/data/sitePresentation.ts`.
2. `src/pages/index.astro` renders the redesign page component with the new header, footer and bottom bar, through `BaseLayout theme={siteTheme}`, when the variant is 'redesign'. Keep the other variants working.
3. Leave `googleReviews` in business.ts untouched (the site keeps 5.0). Keep **exactly**:
   - the `seo` object (title "Katy Handyman | Elevate Your Space Handyman", the description template, canonical "/")
   - `homePageSchema(homeFaqs)`
   - the data passed in (reviews, city links, community links)
4. /home2/ goes back to its documented job: preview of the NON-live variant. It now renders `HomeSmallRepairPage` (the old homepage) with whichever chrome the legacy pages use. It stays noindex, canonical "/", out of the sitemap, title "Previous Homepage Preview | Elevate Your Space".
5. docs/analytics-events.md:
   - "/" now carries the redesign's placements, and stops firing `pathway_cta_click`, `media_wall_cross_sell_view` and `media_wall_request_click`. Those sections are no longer on "/"; the events still exist elsewhere if their components are used.
   - These placements are no longer on "/": `home_hero_custom_project`, `home_hero_card`, `home_midpage_1`, `home_reviews_contact`.
   - These were kept on purpose: `home_hero_primary`, `home_hero_secondary`, `home_hero_trust`, `home_reviews`, `trust_bar`, `home_final_cta`.
   - Section ids are now the redesign's.
6. docs/03 "migration status": the homepage is live on the new system.

## Verification (live "/" after the deploy, clicking nothing)
**Compare to before the flip.** The title, meta description, canonical, robots (index) and JSON-LD (business node plus FAQPage, with every homeFaqs question present in both the schema and the visible FAQ) are identical to before. "/" is still in sitemap-0.xml. There is exactly one H1, with the identical text "Handyman Services for Katy & Fulshear".

**Re-run all of 013's checks on live "/":**
- gold count at every width
- bar and header-Call behaviour
- tel:, Jobber and 718 checks
- no-wrap and no-overflow
- no console errors

**Internal links.** Every link that the old "/" had to a /services/*, /service-areas/* or /our-work/* page is still present, apart from links that only lived in the removed sections. List any link that disappeared in the item file.

**Tracking.** The gtag config for G-9D5MCDT0L1 and AW-16988082106 is still in the HTML.

**If anything fails** and can't be fixed forward inside this item:
1. `git revert` the flip and push.
2. Confirm the old homepage is live again.
3. Mark the item BLOCKED with the reason.
4. Stop.

## Build notes (Claude Code, 26 Oct 2026)
Gate: 013 DONE (1eb5f72); all of 013's Playwright checks re-run against live https://www.eyshandyman.com/home2/ and ?theme=black at six widths on 26 Oct 2026, all pass.

Decisions:
- `src/pages/index.astro` keeps one `seo`, one `homePageSchema(homeFaqs)` and one `pageProps` for every variant; the redesign branch renders `BaseLayout theme={siteTheme}` + SiteHeader + HomeRedesignPage + SiteFooter + SiteBottomBar, the others keep the legacy chrome (and VanBand). HomeRedesignPage accepts `projectCount` / `publishedReviews` so all variants get the same props, and uses the city and community links.
- /home2/ description: "Internal preview of the previous homepage. The live homepage is at the root URL."

Pre-push comparison against the previous build of "/": title, meta description, canonical, robots ("index, follow, max-image-preview:large") and the JSON-LD graph (business node + FAQPage) are identical; one H1, identical text "Handyman Services for Katy & Fulshear"; all 5 homeFaqs questions are in the schema and in the visible FAQ.

Internal links in `<main>` to /services/*, /service-areas/* and /our-work/*: 48 before, 55 after. Disappeared: only `/service-areas/` (the hub link that lived in the removed map section "Service Areas"; the header and footer still link it on every load of "/"). Added: /our-work/ and seven project pages (gallery tiles).

All of 013's checks pass on the local build of "/" at 390, 768, 1024, 1180, 1280 and 1440 (the `?theme=black` switch exists only on the preview, so the black-theme check does not apply to "/").

## DONE 2026-10-26 1a19957
"/" renders the redesign (blue theme, new chrome); /home2/ previews the previous homepage ("Previous Homepage Preview | Elevate Your Space", noindex).
Live-verified after the deploy, clicking nothing: title, meta description, canonical, robots and JSON-LD identical to the pre-flip live HTML; "/" still in sitemap-0.xml; one H1 "Handyman Services for Katy & Fulshear"; all 5 FAQ questions in schema and visible; gtag configs for G-9D5MCDT0L1 and AW-16988082106 present; every 013 check (gold count, bar and header Call, tel:, Jobber ids, 718, no-wrap/no-overflow, console) passes on live "/" at all six widths. Only `/service-areas/` left `<main>` (still in header and footer).
