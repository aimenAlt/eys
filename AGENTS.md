# Agent Instructions for EYS Website

You are working on the EYS website for Elevate Your Space Handyman, a Katy / West Houston home-services and handyman business.

## Strategic goal
Build a premium, disciplined, local-service website that increases qualified calls, quote requests, and bookings while preserving SEO.

## Public brand rule
Use **Elevate Your Space Handyman** as the public brand unless explicitly told otherwise.
Use **EYS** as shorthand.
Do not change public copy to **EYS Home Services** without explicit approval.

## Technical doctrine
- Astro-first.
- Static HTML output.
- Tailwind CSS for styling.
- Minimal JavaScript.
- JavaScript only for progressive enhancement:
  - mobile navigation
  - accordions
  - before/after slider
  - gallery filtering
  - booking embed wrapper
- No client-rendered core SEO pages.
- No heavy UI frameworks unless explicitly approved.
- No random npm packages for simple UI.

## Required workflow before coding
1. Read this file.
2. Read `/docs/01-product-spec.md`.
3. Read `/docs/02-site-architecture.md`.
4. Read `/docs/03-design-system.md`.
5. Inspect existing files.
6. Produce a short implementation plan.
7. Make focused changes.
8. Run build/type/lint checks if configured.
9. Summarize what changed and what remains.

## Design doctrine
The approved redesign system is the source of truth: `docs/03-design-system.md`.
- Two themes, one layout: dark blue (default, `siteTheme` in `src/data/sitePresentation.ts`) and black. Every colour is an `--eys-*` token; `[data-theme="black"]` swaps only the dark grounds and the reds. Gold never changes.
- Type: Montserrat 800 for display (`.font-display`, `.eys-h1`…`.eys-figure`, never `font-extrabold`), Inter 400/700 for body.
- Buttons: `.eys-btn` + one of gold / red / navy / outline-light / outline-dark.
- The owner's button rule: exactly one gold button per screen — the header's top-right CTA (phone "Call", desktop "Get a Free Quote"; the phone bottom bar's "Call" replaces it while the bar shows). The other action is red (phone: form red, call outline; desktop: call red, form outline). Card booking buttons are navy. Gold never sits on a light ground.
- One system on every page: every page renders on `siteTheme`, and under `html[data-theme]` the legacy `brand-*` and Tailwind `neutral-*` tokens are re-pointed at the `--eys-*` palette, so older components inherit it. Headings on themed pages are Montserrat 800.
- Rhythm: navy for the header, every hero (`.eys-page-hero` on inner pages), showcase bands (homepage Our Work, owner band), the photo closing CTA (`.eys-closing`) and the footer; white or warm between them.
- Depth and motion are part of the system: `.eys-card` (soft shadow, lift and photo ease on hover), the skewed red bar (`.eys-kicker`, `.eys-barred`), ambient light on navy heroes, one-time fade-up on scroll (`.eys-reveal`, homepage only, off under reduced motion). No cartoon icons, busy backgrounds, gradient-filled buttons or looping animation.
- Real project photos through SiteImage only. Never crop, cover-fit or overlay the Eyad-and-van photo.
- A redesign never changes copy: headings, words, links, alt text and schema stay byte-identical (verify with a built-HTML diff against the previous build).

## SEO doctrine
A daily automated task requests Google indexing for unindexed pages — see
`docs/gsc-indexing-automation.md`. It reads `dist/sitemap-0.xml` automatically,
so no action is needed here when you add/rename/remove pages, but skim that doc
if you're doing SEO or routing work.

Every service/location/project page must have:
- one clear H1
- SEO title
- meta description
- canonical path
- crawlable body content
- internal links
- relevant CTA
- image alt text
- FAQ data where useful
- local/service relevance

## Core components
SiteHeader, SiteFooter, SiteBottomBar, Button (site chrome, `src/components/site/`; sitewide since backlog 015), VanBand, Section, Hero, TrustBar, ServiceCard, ServiceGrid, ReviewCard, ProjectCard, ProjectGallery, BeforeAfter, AreaGrid, FAQAccordion, ProcessSteps, CTASection, BookingPathSelector, JobberEmbedWrapper, SEOHead, SchemaJsonLd.

## CMS model
Content lives in GitHub as Markdown/MDX/YAML/JSON through Pages CMS.
Cloudflare stores heavy project/job images.
Content files store image URLs + alt text + captions + metadata.

## Safety
Do not delete content, rewrite strategy, or restructure routing broadly unless asked.
Create incremental, reviewable commits.
When unsure, ask for confirmation before irreversible changes.
