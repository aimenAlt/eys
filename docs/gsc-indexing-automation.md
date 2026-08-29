# Google Search Console daily indexing-request automation

Started 2026-08-28. A scheduled Claude task ("Daily EYS Search Console indexing
requests") runs daily (~8am Central) and requests indexing in Google Search
Console for pages that aren't indexed yet, using the URL Inspection tool's
"Request Indexing" button (Google has no general API for this on ordinary
pages — only the URL Inspection UI, capped at roughly 10-12 requests/day per
property).

## How it tracks state

`docs/gsc-indexing-log.json` is the source of truth for "have we already
requested this URL, and does its content still match what we requested." It's
kept in sync with the site's actual pages by `scripts/gsc-indexing-log.mjs`,
which reads `dist/sitemap-0.xml` (the last build) — so it automatically picks
up any page added, renamed, or removed the next time the site is built, with
**no manual coordination required** between this automation and
whoever/whatever is editing the site (including a Claude Code session doing
normal page work).

```bash
node scripts/gsc-indexing-log.mjs sync        # rebuild dist/ first if it's stale, then run this to pick up new/changed pages
node scripts/gsc-indexing-log.mjs status      # {total, requested, pending, pending_in_cooldown}
node scripts/gsc-indexing-log.mjs next 10     # next 10 pending URLs, priority order (cooldown-eligible only)
node scripts/gsc-indexing-log.mjs mark <url>  # record that a URL was submitted
```

## Policy

- Priority order: `/service-areas/*` → `/services/*` → `/pricing/` & `/reviews/`
  → `/our-work/*` → everything else (see `priorityTier()` in the script).
- The daily run works through the **existing backlog first**. Only once every
  currently-tracked page has been requested at least once does it start
  prioritizing newly-discovered pages (added to `sync`) — per Aimen's
  explicit instruction (2026-08-28), so a torrent of brand-new pages can't
  push established money pages to the back of the queue.
- Only pages Search Console shows as "Discovered - currently not indexed" or
  "Crawled - currently not indexed" get indexing requests. Pages showing as
  "Page with redirect," "Not found (404)," "Redirect error," or "Duplicate,
  Google chose different canonical" need an actual technical fix, not a
  request — the automation skips those and flags a high/rising count back to
  Aimen instead of touching them.
- **Content-change re-requeue.** Every `sync` hashes the `<main
  id="main-content">` region of each already-requested page's built HTML and
  compares it to the hash captured at the time it was last marked requested.
  If a page's actual content changed since it was last requested (not just a
  shared header/footer/nav edit — hashing is scoped to `<main>` specifically
  to avoid that false positive), it's automatically requeued to `pending` so
  it gets re-submitted to Google. This is what lets an edited page (new
  copy, new photos, a rewritten section) get indexing re-requested without
  anyone having to remember to do it.
- **7-day cooldown.** A page is never re-submitted less than 7 days after its
  last request, even if its content changed in the meantime. If a page's
  content changes while it's still in the cooldown window, `sync` reports it
  as "cooling down" (with days remaining) and leaves it as `requested` — it
  gets swept up and requeued automatically on a later `sync`, once the 7 days
  have passed. Nothing needs to be re-run manually for that to happen.

## If you're editing pages here

You don't need to do anything for this system — it discovers new and changed
pages automatically from the next `npm run build` + `sync`. Two things worth
knowing:

- `/curtain-installation/` (root-level, no `/services/` prefix) is an
  **intentional, dedicated Meta Ads landing page** — confirmed by Aimen
  2026-08-28, not a duplicate of `/services/curtain-installation/`. It's
  meant to have its own unique copy distinct from the main services page. As
  of 2026-08-28 the two pages' `<main>` content hashes are already
  different, consistent with that. If you're ever touching either page,
  worth a quick gut-check that they've stayed differentiated rather than
  drifting back toward duplicate copy — but there's no routing bug here and
  nothing to "fix."
- As of 2026-08-28 the live sitemap (68 URLs) has a lot of newer, more
  granular service and community pages (e.g. `/services/media-walls/`,
  `/services/tile-installation/`, `/service-areas/richmond/*`) that Google's
  Search Console "Discovered" list from 2026-08-20 doesn't mention at all —
  meaning Google may not have found them yet. If growth stalls, resubmitting
  the sitemap in GSC (Indexing → Sitemaps) is worth doing alongside this
  per-URL automation.
