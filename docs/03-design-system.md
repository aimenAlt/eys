# Design System — EYS

## Visual direction
Dark hero, light body, red conversion accents.

The site should feel:
- premium
- disciplined
- masculine
- local
- trustworthy
- clean
- structured

Not:
- cheap
- cartoonish
- cluttered
- bloated
- franchise-generic

## Colors

```css
--color-black: #080A0C;
--color-charcoal: #111418;
--color-graphite: #1B2026;
--color-red: #D62828;
--color-red-dark: #A91515;
--color-silver: #C7CBD1;
--color-mist: #F4F5F7;
--color-white: #FFFFFF;
--color-text: #15171A;
--color-muted: #5E6670;
```

## Layout
- Max width: 1180–1280px.
- Section padding: 72–120px desktop, 48–72px mobile.
- Grid: 12-column desktop, 1-column mobile.
- Cards: clean white cards, subtle borders/shadow, red accent line.

## Homepage sections
1. Header
2. Hero
3. Trust bar
4. Services overview
5. Featured service
6. Why choose EYS
7. Project proof
8. Process
9. Reviews
10. Service areas
11. FAQ
12. Final CTA
13. Footer

## CTA rules
Primary CTA:
- red background
- white text
- direct action copy
- always visible above fold
- repeated throughout page

Recommended labels:
- Request a Quote
- Book TV Mounting
- Call Now
- Schedule Assessment
- Send Photos for Estimate

## VanBand (Eyad and the EYS van first)
`src/components/common/VanBand.astro`, backlog 011 (Aimen, 25–26 Oct 2026). The photo of
Eyad in front of the wrapped EYS van (`vanEyadPhoto` in `src/data/images.ts`) is the first
thing inside `<main>` on:
- every Google Ads landing page in `src/data/adsLandingPages.ts` (ContentLayout renders it
  for the ones it wraps; /start/, /services/media-walls/ and /lp/built-ins-shelving-storage/
  place it in the page file), and
- "/" while it shows the old homepage (never on /home2/, never in the redesign, whose hero
  is the same photo).

Phone/tablet (<1024): the photo alone, full-bleed at its natural 3:2, flush under the header.
Desktop (≥1024): a black band in the hero's container — the photo at 390×260 (radius 6px)
beside three plain lines of owner copy, no heading tags, nothing clickable. Never crop,
cover-fit, blur or overlay the photo: every letter and badge on the van stays visible.
