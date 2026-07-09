# Claude / Agent Instructions for EYS Website

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
Visual direction:
- Premium local contractor.
- Black/charcoal hero.
- Red CTAs.
- White/light body sections.
- Silver/gray accents.
- Angular, strong, structured layout.
- Authentic project imagery.
- Mobile-first CTAs.

Avoid:
- cheap handyman flyer aesthetic
- cartoon icons
- excessive gradients
- busy backgrounds
- cluttered cards
- generic stock-photo dependency
- gimmicky animations

## SEO doctrine
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
Header, Footer, Button, Section, Hero, TrustBar, ServiceCard, ServiceGrid, ReviewCard, ProjectCard, ProjectGallery, BeforeAfter, AreaGrid, FAQAccordion, ProcessSteps, CTASection, BookingPathSelector, JobberEmbedWrapper, MobileStickyCTA, SEOHead, SchemaJsonLd.

## CMS model
Content lives in GitHub as Markdown/MDX/YAML/JSON through Pages CMS.
Cloudflare stores heavy project/job images.
Content files store image URLs + alt text + captions + metadata.

## Safety
Do not delete content, rewrite strategy, or restructure routing broadly unless asked.
Create incremental, reviewable commits.
When unsure, ask for confirmation before irreversible changes.
