// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Preview-only GitHub Pages project site: https://aimenalt.github.io/eys/
// Production (Cloudflare / custom domain) keeps site root paths.
const githubPages = process.env.GITHUB_PAGES === 'true';

// Single fallback timestamp for every sitemap entry, captured once per build
// (production deploys replace it with per-page dates; see the sitemap config).
const buildTimestamp = new Date().toISOString();

// https://astro.build/config
export default defineConfig({
  site: githubPages ? 'https://aimenalt.github.io' : 'https://www.eyshandyman.com',
  base: githubPages ? '/eys/' : '/',
  trailingSlash: 'always',
  image: {
    // Used when images are imported from src/ via astro:assets.
    // Public-folder photos use SiteImage.astro for dimensions/loading contract.
    layout: 'constrained',
  },
  build: {
    // Avoid render-blocking /_astro/*.css requests (Lighthouse critical path).
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/home2') &&
        !page.includes('/privacy') &&
        !page.includes('/terms') &&
        !page.includes('/van') &&
        // Print-QR / offline conversion landing — noindex, so it must not
        // appear here either. A noindex URL in a sitemap lowers trust in the
        // whole file.
        !page.includes('/start') &&
        // Paid ad-group landing pages — noindex, Ads-only.
        !page.includes('/lp/') &&
        // Unlisted: /go/* handoff pages are texted to a client by hand and
        // /essa/ is an internal tool. Both are noindex, so neither belongs in
        // the sitemap.
        !page.includes('/go/') &&
        !page.includes('/essa/') &&
        !page.includes('/booking-confirmed') &&
        !page.includes('/request-confirmed'),
      // The build stamps every URL with the build time as a fallback. On
      // production deploys, `scripts/indexnow.mjs prepare` rewrites each
      // <lastmod> from dist/indexnow-manifest.json, so a page's date moves
      // only when its own content (title, description, canonical, <main>)
      // changes. If that step fails, these build-time stamps ship as before.
      // See docs/indexnow.md.
      serialize: (item) => ({ ...item, lastmod: buildTimestamp }),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
