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

## Findings (Claude Code, cloud session, 2026-10-12)
- **Live curl chains could not be captured from this session.** The cloud container's egress policy
  denies `eyshandyman.com` and `www.eyshandyman.com` (proxy answers 403 to CONNECT; WebFetch gets
  ENOTFOUND). Step 1 has to be run from the Mac — the four commands above, unchanged.
- **The apex is not served by this repo.** `.github/workflows/deploy-cloudflare.yml` and
  `docs/06-setup-commands.md` attach only `www.eyshandyman.com` to the Pages project `eys`;
  `docs/07-seo-playbook.md` and `docs/08-legacy-url-redirects.md` record the apex → www redirect as a
  Cloudflare dashboard rule (`eyshandyman.com/*` → `https://www.eyshandyman.com/$1`, the Page Rule /
  forwarding-URL syntax). Adding apex lines to `public/_redirects` would do nothing, because Pages
  `_redirects` only runs on hosts attached to the project. So per step 2 this item stops here; nothing
  was changed in the repo.
- The Sep 2026 audit (`docs/seo-domain-canonical-audit.md`) recorded `http://eyshandyman.com/` →
  `https://eyshandyman.com/` → `https://www.eyshandyman.com/` (2 hops) and 3 hops for apex + legacy
  path. The Sep 23–28 "Redirect error" on apex deep paths only means the old rule mishandled
  deep paths at that time. Likely causes: a Page Rule whose pattern matched only the root, a
  `$1`/wildcard mismatch, or a moment when the apex DNS record was not proxied. Replacing it with one
  explicit Single Redirect removes all of those.

## Needs Aimen in Cloudflare
Cloudflare dashboard → eyshandyman.com zone:
1. **DNS → Records:** the `eyshandyman.com` (apex) record must be **Proxied** (orange cloud). If it is
   grey-cloud, no rule below can run. Any target is fine while proxied: a placeholder `A 192.0.2.1`,
   or the existing CNAME to `eys-48z.pages.dev`.
2. **Rules → Page Rules** and **Rules → Redirect Rules → Bulk Redirects:** disable or delete any existing
   rule that forwards `eyshandyman.com/*`. Keep exactly one apex rule (the one below), so there are no
   competing hops.
3. **Rules → Redirect Rules → Single Redirects → Create rule**
   - Name: `Apex to www (301, keep path + query)`
   - If incoming requests match → Custom filter expression:
     `(http.host eq "eyshandyman.com")`
   - Then → URL redirect → Type **Dynamic**, expression:
     `concat("https://www.eyshandyman.com", http.request.uri.path)`
   - Status code **301**, **Preserve query string: ON**
   - Place it **first** in the Single Redirects list. Deploy.
   This is the dashboard form of the target `https://www.eyshandyman.com${uri}`. It matches both http and
   https apex, so `http://eyshandyman.com/<path>` also lands on www https in one redirect. If
   "Always Use HTTPS" still shows an extra http→https hop first, that is acceptable: still ≤ 2 hops,
   no loop.
4. Do not touch the www host or the 44 legacy "Page with redirect" URLs (those are `public/_redirects`
   on www and are correct).
5. Verify from the Mac — each must show ONE `301` with `location: https://www.eyshandyman.com/<same path>/`,
   then `200`:
   ```
   UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
   for u in https://eyshandyman.com/book/ http://eyshandyman.com/book/ \
            https://eyshandyman.com/our-work/pergola-privacy-wall/ https://eyshandyman.com/ \
            "https://eyshandyman.com/contact/?utm_source=test"; do
     echo "== $u"; curl -sIL -A "$UA" "$u" | grep -iE '^(HTTP|location)'; done
   ```
   Then click "Validate fix" on the Redirect error report in Search Console.

Status: **blocked on Aimen (Cloudflare dashboard)**. No repo commit for the fix itself; only this note.
