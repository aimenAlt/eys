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
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
