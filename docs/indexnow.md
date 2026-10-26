# IndexNow and sitemap lastmod

Every production deploy tells Bing and the other IndexNow engines (Yandex, Seznam, Naver…)
which pages were added, changed or removed, within minutes. Unchanged pages are never
resubmitted. Google does not use IndexNow; it gets honest `<lastmod>` dates in the sitemap
from the same change detection.

## How it works

`scripts/indexnow.mjs`, Node built-ins only, runs in the `deploy-production` job of
`.github/workflows/deploy-cloudflare.yml` (never on preview deploys):

1. **prepare** (before the Cloudflare deploy) hashes each sitemap URL from the built `dist/`:
   title + meta description + canonical + the `<main id="main-content">` region. Header,
   footer, nav and JSON-LD are left out, so template-wide edits never move a page. It
   compares the hashes with the live `https://www.eyshandyman.com/indexnow-manifest.json`,
   writes the new `dist/indexnow-manifest.json` (`{ url: { hash, lastmod } }`), rewrites every
   `<lastmod>` in `dist/sitemap-0.xml` (unchanged page = previous date, added or changed =
   deploy time), sets the `sitemap-index.xml` date to the newest page date, and saves the
   added + changed + removed URLs to `$RUNNER_TEMP`. With no live manifest (first run), every
   URL is submitted once and dated with the deploy time.
2. **submit** (after the deploy) waits for the key file to be live, then POSTs the list to
   `https://api.indexnow.org/indexnow`. The result (HTTP 200/202 and the URL count) appears in
   the deploy run's summary. Any other status is a `::warning::`.

Both steps are `continue-on-error`: a failure never blocks a deploy. If prepare fails, the
build-time sitemap stamps from `astro.config.mjs` ship unchanged and nothing is submitted.

The `<main>` extraction is shared with `scripts/gsc-indexing-log.mjs` through
`scripts/lib/page-content.mjs`.

## The key

The key is a random 32-character hex string. It lives in `public/<key>.txt` (the file contains
exactly the key) and is served at `https://www.eyshandyman.com/<key>.txt`. The script finds it
by looking for the single 32-hex `.txt` file in `public/`.

## Rotating the key

1. Generate a new key: `python3 -c "import secrets; print(secrets.token_hex(16))"`.
2. Delete the old `public/<old-key>.txt` and add `public/<new-key>.txt` containing exactly the
   new key (no newline needed).
3. Push to main. The next deploy publishes the new key file and uses it.

## Local dry run

```bash
npm run build
INDEXNOW_PREVIOUS_MANIFEST=/path/to/old-manifest.json RUNNER_TEMP=/tmp node scripts/indexnow.mjs prepare
```

Without `INDEXNOW_PREVIOUS_MANIFEST`, prepare reads the live manifest. Don't run `submit`
locally: it pings the real IndexNow endpoint.
