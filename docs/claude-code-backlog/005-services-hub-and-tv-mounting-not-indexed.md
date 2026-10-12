# 005 — `/services/` is "Discovered – not indexed, no referring page"; `/services/tv-mounting/` is unknown to Google

## Decision already made
Both pages are in the sitemap but Google reports no referring page for `/services/` and does not know
`/services/tv-mounting/` at all. Fix the internal linking so both are reachable from crawlable HTML links,
then run the existing indexing queue script.

## Do this
1. `grep -rn 'href="/services/"' src` and `grep -rn '/services/tv-mounting/' src dist` — confirm whether the
   header nav, footer and the homepage link to `/services/` and `/services/tv-mounting/` with plain
   `<a href>` (not JS-only menus). If the nav renders links only via client-side JS, add plain anchors in
   the footer "Services" column for `/services/` (hub) and for `/services/tv-mounting/`.
2. Confirm `dist/sitemap-0.xml` contains both URLs after `npm run build`.
3. Run `node scripts/gsc-indexing-log.mjs sync` then `status`, and make sure both URLs are queued (the queue
   respects `priorityTier()` — `/services/` is a hub; do not change tiers).
4. Do NOT request indexing yourself (that is a Search Console click Aimen does; see the digest's list).

## Verification
check + build clean; live footer HTML contains both hrefs; `docs/gsc-indexing-log.json` shows both URLs
pending; commit the updated log json with the change.
