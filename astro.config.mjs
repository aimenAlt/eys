// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Preview-only GitHub Pages project site: https://aimenalt.github.io/eys/
// Production (Cloudflare / custom domain) keeps site root paths.
const githubPages = process.env.GITHUB_PAGES === 'true';

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
        !page.includes('/booking-confirmed') &&
        !page.includes('/request-confirmed'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
