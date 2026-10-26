# 011: Eyad and the EYS van first, on the homepage and on every page Google Ads sends people to

## Order and gate
- **Work this item first.** It is Aimen's priority (25–26 Oct 2026).
- Run it in Claude Code on the Mac: its photo exists only in the untracked `Claude outputs/` folder.
- It has no gate and depends on no other item. If 012 to 015 later run and pass, everything here keeps working.

## Decision already made
Aimen, 25–26 Oct 2026: visitors see Eyad and the EYS van first. The wrapped van (name, phone number and its badges) is the quickest proof that EYS is a real local company, and Eyad's face shows who comes to the house.

The photo is `eys-van-eyad.jpg`: Eyad standing in front of the van's cab, smiling, in his EYS shirt. Cowork composited it on 26 Oct from the retouched van photo and Eyad's site portrait. Every letter and badge on the van stays visible.

One new component, `VanBand`, renders this photo as the first thing inside `<main>`, on the pages below and nowhere else.

The redesigned homepage (013/014) uses the same photo as its hero instead. So on "/", the band renders only while "/" still shows the old homepage.

## Pages
**Google Ads pages.** From the Google Ads landing-page report for Sep 25 to Oct 24, 2026. The list covers ad final URLs and sitelinks.

| Path | Ads clicks, 30 days | Renders through |
|---|---|---|
| /start/ | 44 | own chrome (StartHeader) |
| /services/media-walls/ | 41 | own chrome (MediaWallHeader) |
| /lp/built-ins-shelving-storage/ | 24 | own chrome (header inline in the page) |
| /services/repairs-and-maintenance/ | 11 | ServiceCategoryLayout → ContentLayout |
| /services/limewash-walls/ | 7 | ServiceLayout → ContentLayout |
| /services/handyman-to-do-list/ | 6 | ContentLayout |
| /our-work/ | 2 | ContentLayout |
| /services/tv-mounting/ | 1 | ServiceLayout → ContentLayout |
| /services/custom-carpentry/ | 0 (still a final URL) | ServiceLayout → ContentLayout |

- Keep these nine paths in ONE data module (for example `src/data/adsLandingPages.ts`).
  - Add a comment giving the source and date above.
  - Say the list changes only when ad final URLs or sitelinks change.
  - Every placement reads it.

**Homepage "/".** In `src/pages/index.astro`, render the band as the first child of `<main>` only while `homepageVariant !== 'redesign'`.
- Never render it on /home2/.
- Never render it in the redesign branch: its hero is already this photo.

No other page changes.

## VanBand
Build it as one new component (for example `src/components/common/VanBand.astro`).

**Image:** `/images/home/eys-van-eyad.jpg` (1200×800).
- It isn't in the repo yet. Copy `Claude outputs/design-round3/build-images/eys-van-eyad.jpg` to `public/images/home/eys-van-eyad.jpg`, then run `npm run images`. Commit the original, the WebP derivatives and `src/data/imageDerivatives.json`.
- Keep its path and alt text in one shared constant (for example in `src/data/images.ts`). The homepage hero in 013 reads the same constant, so a future photo swap is one edit.
- Use one `<img>` through SiteImage:
  - width 1200, height 800
  - eager, fetchpriority high
  - `sizes="(min-width: 1024px) 390px, 100vw"`
- Alt: "Eyad Essa, owner of Elevate Your Space Handyman, in front of the EYS van with its lettering, phone number and badges".

**Markup:** one DOM for every width: `<section aria-label="Who runs your project" data-analytics-section="van_band">`.

**Phone and tablet (<1024):**
- Only the photo: full-bleed at its natural 3:2 (100vw wide, height auto), flush under the page header.
- No text, no caption, no padding.

**Desktop (≥1024):** a band.
- **Ground:** the black hero ground (`bg-brand-black`), with a 1px white/10 bottom border.
- **Container:** the page hero's own container, with 24px top and bottom padding.
  - max-w-6xl on the three own-chrome pages.
  - `contentMaxClass` and `contentPaddingClass` on ContentLayout pages and "/".
- **Left:** the photo at 390×260, radius 6px.
- **Right:** 32px gap, vertically centred, three plain text lines. They are the approved owner-band copy from 013, section 6, not new claims. Use no heading tags, so each page's H1 stays its first heading.
  - "Who runs your project": the /start/ hero eyebrow style (11–12px, bold, uppercase, tracking .16em, `text-brand-redondark`).
  - "Eyad Essa · Owner · U.S. military veteran": 20px, bold, white.
  - "Your one point of contact on every project.": 16px, white/80.
- Nothing in the band is a link or a button.

**Never do any of these to the photo:**
- crop, blur or shrink it below these sizes
- put a gradient, text, caption or badge on top of it
- turn the wrap's badge text into site copy

## Placement
**Where:** the band is the first child of `<main id="main-content">`, directly under the page header and above breadcrumbs and the hero.

**How:**
- On the three own-chrome pages and "/", add it in the page file.
- On ContentLayout pages, render it from ContentLayout when the current path is in the list (normalise the trailing slash). Use a smaller wiring if you find one.

**Leave alone:**
- Don't touch any hero, ServiceLayout, ServiceCategoryLayout or header markup. The only exception is the spacing fix in Verification.
- Keep the sticky-bar hooks exactly as they are: `data-start-hero-cta`, `data-media-wall-hero-cta`, `data-lp-hero-cta`, `data-sticky-hero-cta`. The bars must still appear only after the hero buttons scroll away.

## Hard rules
- Every rule in the README applies.
- No new links, `cta_location` values or claims.
- Pages not listed above render byte-identical `<main>` HTML before and after.

## Docs (same commit)
- **docs/analytics-events.md:** the new section id `van_band` (it fires section_view), and the pages it renders on.
- **docs/03:** VanBand, and where it renders.
- **AGENTS.md "Core components":** add VanBand.

## Verification
**Local production build.** Run Playwright at 390×844 and 1440×900 on all ten pages, clicking nothing.

**The photo:**
- The whole photo is visible without scrolling.
- Its rendered box is 3:2 (±1px).
- object-fit is never `cover` on it, and nothing sits on top of it.

**The H1:** at 390×844, the page's whole H1 is visible without scrolling.

**Hero buttons:**
- Before this item, the hero buttons were fully visible at 390×844 on "/", /start/, /lp/built-ins-shelving-storage/, /services/repairs-and-maintenance/ and /services/handyman-to-do-list/. They must still be.
- If one isn't, tighten that page's hero top spacing until it is. Never shrink the photo.
- Record each page's before and after button positions in this file.

**Other checks:**
- No horizontal scroll and no console errors.
- The photo is served as WebP from its srcset.
- The sticky bars still appear only after the hero buttons scroll away.

**Unchanged pages:** pages not in the list must have byte-identical `<main>` HTML to the previous build. Check:
- /home2/, /services/, /contact/, /pricing/
- a city page, a community page, a project page
- another /services/[slug]/ page
- /van/, /curtain-installation/

**Live, after the deploy:**
- One phone render and one desktop render each of "/", /start/, /services/media-walls/ and /lp/built-ins-shelving-storage/.
- Never click a `tel:` or Jobber link on the live site: they count as Google Ads conversions.

## Measurement (Cowork, 14 days after the deploy)
- For each listed path, compare Ads conversions per click and GA4 key events per session over the 14 days before and the 14 days after.
- If a page's rate falls by more than a third, with at least 60 sessions on each side, Cowork proposes moving the photo below that page's hero buttons.

## Build notes (Claude Code, 26 Oct 2026)
Decisions:
- Wiring: `src/data/adsLandingPages.ts` (nine paths + `isAdsLandingPage`). ContentLayout renders the band when `Astro.url.pathname` is listed; /start/, /services/media-walls/ and /lp/built-ins-shelving-storage/ place `<VanBand container="6xl" />` in the page file; "/" renders it while `homepageVariant !== 'redesign'` (cast to string until 013 adds that variant to the type).
- Shared constant: `vanEyadPhoto` in `src/data/images.ts` (src, 1200×800, alt).
- Box model matches each hero so the photo lines up with the H1 at 1440: own-chrome pages pad the section and centre a max-w-6xl box (photo at x=144, same as the H1); ContentLayout pages and "/" use max-w-7xl with lg:px-8 inside (photo at x=112, same as the H1 and breadcrumb).
- The photo sits in its own wrapper div: SiteImage's `<picture>` is `display: contents`, so its `<source>` otherwise became an empty flex item and pushed the photo 32px right through the gap.
- `npm run images` made 480w and 768w WebP only (the original is 1200 wide and the script never upscales); phones at 2× get the 768w file.
- No hero spacing fix was needed: every page that had fully visible hero buttons at 390×844 still does.

Hero buttons at 390×844 (bottom edge of the hero CTA group, px from the top of the viewport; must be ≤ 844):

| Page | Before | After | Visible after |
|---|---|---|---|
| / | 580 | 840 | yes |
| /start/ | 367 | 627 | yes |
| /lp/built-ins-shelving-storage/ | 422 | 682 | yes |
| /services/repairs-and-maintenance/ | 485 | 745 | yes |
| /services/handyman-to-do-list/ | 393 | 653 | yes |
| /services/tv-mounting/ (not required) | 523 | 783 | yes |
| /services/custom-carpentry/ (not required) | 580 | 840 | yes |
| /services/limewash-walls/ (not required) | 647 | 907 | no (was visible; not in the required list) |
| /services/media-walls/ (not required) | 1067 | 1327 | no (was already below the fold) |

Local production build, Playwright at 390×844 and 1440×900 on all ten pages, clicking nothing: photo first in `<main>`, fully visible without scrolling, rendered 390×260 (3:2), object-fit `fill` (never cover), nothing on top of it (elementFromPoint at its centre is the img), served as WebP from the srcset; whole H1 visible at 390×844 on every page; no horizontal scroll; no console errors; sticky bars absent at the top and shown after 1400px on all ten pages. `<main>` HTML changed on exactly these ten pages out of 114 built pages; byte-identical on all others (incl. /home2/, /services/, /contact/, /pricing/, Katy, Cinco Ranch, a project page, /services/drywall-repair/, /van/, /curtain-installation/).
