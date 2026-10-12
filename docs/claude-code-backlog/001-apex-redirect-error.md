# 001 — Apex-host "Redirect error" in Search Console (37 URLs)

## Decision already made
Find out why Googlebot gets a *redirect error* (not a clean 301) on `https://eyshandyman.com/<path>/`
for current pages, and fix it so every apex URL 301s in ONE hop to `https://www.eyshandyman.com/<same path>/`.

## Evidence
- GSC Page indexing (Oct 9 2026): "Redirect error" = 37 URLs, validation Not Started, ALL of them
  apex-host versions of live www pages crawled Sep 23–28: /book/, /contact/, /about/, /blog/, /reviews/,
  /pricing/, /sitemap/, /curtain-installation/, /blog/move-in-upgrades-sunterra/ and 28 `/our-work/<slug>/`.
  Full list: `~/Downloads/eys-data-2026-10-11/gsc/indexing_redirect-error/Table.csv`.
- The same report shows `https://eyshandyman.com/` (root) as a clean "Page with redirect", so the root
  rule works and deep paths do not — or did not during Sep 23–28.
- `grep -r "https\?://eyshandyman\.com" src public astro.config.mjs` returns nothing: the site emits no
  apex URLs. Google found the apex deep URLs on its own, which means something answered 200 or a loop
  on apex deep paths at some point.
- In a browser today `https://eyshandyman.com/our-work/pergola-privacy-wall/` ends on www, so it may be
  Googlebot-specific or a chain (http→https apex→www http→www https) that exceeds Google's limit.

## Do this
1. From the Mac (unrestricted network), capture the full chain for Googlebot and a normal UA:
   `curl -sIL -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://eyshandyman.com/book/`
   and the same for `http://eyshandyman.com/book/`, `https://eyshandyman.com/our-work/pergola-privacy-wall/`,
   `https://eyshandyman.com/`. Record every hop (status + Location) in this file.
2. If any chain has more than one hop, loops, or returns 200 on apex: fix at the source. The apex is
   served by Cloudflare (Pages custom domain or a redirect rule), not by this repo's `public/_redirects`
   (Pages `_redirects` only runs on hosts attached to the Pages project). If the apex is attached to the
   Pages project, add at the TOP of `public/_redirects`:
   `https://eyshandyman.com/* https://www.eyshandyman.com/:splat 301` and
   `http://eyshandyman.com/* https://www.eyshandyman.com/:splat 301`.
   If the apex is handled by a Cloudflare Redirect Rule / Bulk Redirect, you cannot change it from the
   repo: write the exact rule that is needed (expression + target `https://www.eyshandyman.com${uri}`,
   301, preserve path+query) at the bottom of this file under `## Needs Aimen in Cloudflare` and stop
   this item there.
3. Verify live after deploy: every URL above must return exactly one 301 to the www twin, then 200.
4. Do NOT touch the 44 legacy "Page with redirect" URLs — those are correct and intended.

## Verification
`npm run check` + `npm run build` clean; live curl chains recorded here. Aimen will click
"Validate fix" in Search Console afterwards (that part is not yours).
