# Implementation Roadmap

## Phase 0 — Local machine and repo safety
- Install tools.
- Create branch.
- Preserve existing homepage.
- Add documentation and agent rules.
- Do not rewrite design yet.

## Phase 1 — Astro foundation
- Add Astro to repo.
- Add Tailwind.
- Add base layout.
- Add global CSS tokens.
- Move existing HTML homepage into `src/pages/index.astro`.
- Make it render exactly or nearly exactly first.

## Phase 2 — Component extraction
Extract from homepage:
- Header
- Hero
- TrustBar
- ServiceGrid
- CTASection
- Footer

## Phase 3 — Content collections
Create collections for:
- services
- service areas
- projects
- blog
- reviews

## Phase 4 — Page templates
Build:
- `/services/[slug].astro`
- `/service-areas/[slug].astro`
- `/projects/[slug].astro`
- `/blog/[slug].astro`

## Phase 5 — CMS
Add `.pages.yml` for Pages CMS.

## Phase 6 — Booking
Add:
- `/book/`
- BookingPathSelector
- JobberEmbedWrapper
- request-quote CTA
- TV mounting direct-booking placeholder

## Phase 7 — SEO
Add:
- SEOHead
- canonical URLs
- sitemap
- robots
- schema
- image alt rules
- Open Graph metadata

## Phase 8 — Cloudflare deployment
- Connect GitHub repo.
- Build command: `npm run build`
- Output directory: `dist`
- Test Lighthouse and Search Console after launch.
