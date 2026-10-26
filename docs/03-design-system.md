# Design System — EYS

Source of truth for the approved redesign (Claude Design, Round 3.3, Oct 2026; backlog 012–015).
Code: tokens, fonts, type and button classes at the end of `src/styles/global.css`; theme switch
`siteTheme` in `src/data/sitePresentation.ts`; `BaseLayout theme=…` writes `data-theme` on `<html>`.

## Direction
Premium local contractor, one system on every page. Navy grounds on the header, every hero, the
showcase bands (homepage Our Work, the owner band), the photo closing CTA and the footer; white
`#FFFFFF` or warm `#F6F4F0` between them. Real project photos, the angular skewed red/white stripe
and red slash (from the van's livery), soft depth on cards, one gold button per screen. Not a
flyer: no cartoon icons, busy backgrounds, gradient-filled buttons or looping animation. Subtle
ambient light on navy heroes and a one-time fade-up on scroll (homepage) are allowed.

## One system sitewide (26 Oct 2026)
Every page renders through `BaseLayout theme={siteTheme}` (ContentLayout and the landing pages;
only /essa/ and the /home2/ preview differ). Under `html[data-theme]`, `global.css` re-points the
legacy tokens at this palette, so components that still use them render on the system without a
rewrite:

| Legacy token | Becomes |
|---|---|
| `brand-black` | `--eys-ground` (navy) |
| `brand-charcoal` | `--eys-ground-2` (#0B2C48) |
| `brand-red` / `-redhover` | `--eys-btn-red` / `-hover` |
| `brand-ink` / `brand-muted` | `--eys-ink` / `--eys-ink-2` |
| `brand-lightbg` / `brand-line` | `--eys-warm` / `--eys-rule` |
| Tailwind `neutral-50…900` | navy-tinted greys |
| `.gradient-btn` | flat red |
| `.prose` colours | ink, red bullets and link underlines |

Every `h1`–`h3` on a themed page is Montserrat 800 (base layer, so a font utility still wins).
Inner-page heroes (`PageHero`, `ServiceHero`, `LocalHero`, `SmallRepairHero`, the project and blog
headers, the /services/ and /service-areas/ hubs) use `.eys-page-hero`: navy with ambient light,
`.eys-kicker` eyebrow, `.eys-h1`, `.eys-hero-btn--red|--outline`, the photo in
`.eys-page-hero-media` (radius 14, red parallelogram behind it) and the stripe at the foot. A
breadcrumb row directly above a hero joins its navy ground. `LocalAreaCTA` is the photo closing
CTA (`.eys-closing`). Long-form bodies are capped at `max-w-3xl`.

**Copy is never part of a redesign.** Before shipping, diff the built HTML of every page against
the previous build: titles, descriptions, canonicals, robots, headings, words, links, alt text,
JSON-LD and `data-cta-*` / `data-booking-type` attributes must be identical.

## Tokens
Custom properties on `:root` (blue, the default) and overridden under `[data-theme="black"]`.
Tailwind names: `bg-eys-ground`, `text-eys-ink-2`, `border-eys-rule`, … (`@theme inline`).

| Token | Blue (default) | Black | Use |
|---|---|---|---|
| `--eys-ground` | #002038 | #0A0A0A | Dark grounds (header, hero, owner band, footer, bar) |
| `--eys-panel` | rgba(255,255,255,.07) | #1C1C1C | Panels on dark (hero review card) |
| `--eys-panel-line` | rgba(255,255,255,.16) | #1C1C1C | Panel border |
| `--eys-line-dark` | rgba(255,255,255,.12) | same | Rules on dark |
| `--eys-stripe` | #E30B0B | #B00000 | Skewed stripe band |
| `--eys-accent` | #E30B0B | #FF3333 | Accent dash, active underline (on dark) |
| `--eys-accent-ink` | #E30B0B | #B00000 | Offer line (on light) |
| `--eys-cta-bg` / `-text` / `-hover` | #FDB515 / #002038 / #F0A500 | same | Gold CTA |
| `--eys-btn-red` / `-hover` | #E30B0B / #C40909 | #B00000 / #8F0000 | Red button |
| `--eys-btn-std-bg` / `-text` / `-hover` | #002038 / #FFFFFF / #0A3556 | same | Navy card button |
| `--eys-on-dark` / `-2` / `-3` | #FFFFFF / #D5DEE7 / #B8C7D6 | #FFFFFF / #C9C9C9 / #B5B5B5 | Text on dark |
| `--eys-outline-dark` | rgba(255,255,255,.75) | same | Outline button border on dark |
| `--eys-ink` / `-2` / `-3` | #002038 / #46596B / #5F6F7E | #0A0A0A / #5A5A5A / #6B6B6B | Text on light |
| `--eys-rule` | #D9E0E8 | #E3E3E3 | Rules and card borders on light |
| `--eys-white` / `--eys-warm` | #FFFFFF / #F6F4F0 | same | Light grounds |

## Fonts
- **Montserrat 800** (display): self-hosted latin woff2 from `@fontsource/montserrat`, preloaded only
  on pages that pass a theme. Use `.font-display` or the type classes below. Never `font-extrabold`
  (that utility is deliberately remapped to Inter 700).
- **Inter 400 / 700** (body, buttons): unchanged, preloaded on every page.

## Type scale
Phone below 1024px, desktop from 1024px. Headings use `text-wrap: balance`, paragraphs `pretty`.

| Class | Font | Phone | Desktop | Tracking |
|---|---|---|---|---|
| `.eys-eyebrow` | Montserrat 800, uppercase | 11/16 | 12/16 | .16em |
| `.eys-h1` | Montserrat 800 | 40/44 | 60/62, 68/70 from 1280 | -.025em |
| `.eys-h2` | Montserrat 800 | 30/34 | 44/48 | -.02em |
| `.eys-h3` | Montserrat 800 | 20/26 | 22/28 | -.01em |
| `.eys-figure` (big figure) | Montserrat 800 | 34/38 | 40/44 | -.03em |
| `.eys-body` | Inter 400 | 16/25 | 18/28 | — |

`.eys-kicker` puts the skewed red bar before an eyebrow; `.eys-barred` puts it above a heading
that has no eyebrow.
| `.eys-small-15/14/13/12` | Inter | 15/22, 14/20, 13/18, 12/16 | same | — |

## Spacing, container, breakpoints
- Breakpoints: phone < 768, tablet 768–1023, desktop ≥ 1024 (layout switch), wide ≥ 1280 (board columns).
- Desktop content capped at 1328px and centred (56px side padding at 1440), backgrounds full-bleed.
  Phone side padding 24px. Section padding 64px phone, 112px desktop.
- From 1280px the boards' fixed columns apply (e.g. hero 600px | 1fr); 1024–1279 uses proportional versions.

## Buttons
`.eys-btn` base: 52px tall, radius 6px, Inter 700 16px, gap 10px, nowrap, padding 0 28px, 18px stroke
phone icon where the action is a call. `.eys-btn--block` makes it full width below 1024px.

| Variant | Class | Use |
|---|---|---|
| Gold | `.eys-btn--gold` | Header top-right CTA only (and the phone bar's Call) |
| Red | `.eys-btn--red` | The other action (see the rule) |
| Navy | `.eys-btn--navy` | Card booking buttons |
| Outline light | `.eys-btn--outline-light` | Secondary action on dark grounds |
| Outline dark | `.eys-btn--outline-dark` | Secondary action on light grounds |

### The owner's button rule (every redesigned page obeys it)
- **Exactly one gold button per screen: the header's top-right CTA.** Phone/tablet (<1024): gold "Call".
  Desktop (≥1024): gold "Get a Free Quote".
- The only other gold is the phone bottom bar's "Call" — the same action. It appears only after the
  hero buttons scroll away, and the header Call hides while the bar shows.
- **The other action is red.** Phone/tablet: form buttons red, call buttons outline. Desktop: call
  buttons red, form buttons outline. The same element swaps style and order at 1024px — never duplicate buttons.
- A repeat of the gold action lower on the page is an outline button.
- Card booking buttons are solid navy. Gold never sits on a light ground.
- Red stays on the logo, the stripe and the offer line.

## Accessibility
- Focus rings: 2px white, offset 2, on dark grounds (`.eys-on-dark` ancestor); 2px ink on light grounds.
- Contrast: white on #002038 / #0A0A0A, navy #002038 on gold #FDB515, white on #E30B0B / #B00000 all pass AA
  for 16px bold. Muted text on dark uses `--eys-on-dark-2/3`, never lower.
- Transitions respect `prefers-reduced-motion`.

## Copy rules
- Phone numbers, "Katy & Fulshear" and "West Houston" never break (non-breaking spaces or nowrap spans).
- Words the design writes with U+2011 non-breaking hyphens ("To-Do", "1-hour", "built-ins") use normal
  hyphens inside nowrap spans.
- Never hand-type a value that has a source: phone (`site`), ratings (`googleReviews`), prices
  (`src/data/pricing/`), towns (`areaServed` / `localityShort`), cities and communities (collections).

## Images
Every photo goes through `SiteImage` with real width/height and `sizes` that match the rendered width.
Only the hero image is eager; everything below it lazy-loads. Never crop, cover-fit or overlay the
Eyad-and-van photo.

## Components (redesign)
- **Site chrome** (`src/components/site/`): `SiteHeader` (sticky; phone: logo mark, gold Call, menu
  button; desktop: logo + wordmark from 1344px, nav with the Services dropdown, phone number, gold
  "Get a Free Quote"; mobile menu panel), `SiteFooter` (one DOM placed with grid areas: phone =
  lockup, phone number, tagline, links, contact, socials; desktop = brand | links | links | contact),
  `SiteBottomBar` (phone bar, gold Call + red Free Quote; shown after the hero CTAs, hidden at the
  footer; hides the header Call while it shows).
- **Button** (`Button.astro`): `.eys-btn` + variant; `phoneIcon` adds the 18px icon.
- **CTA pair** (`.eys-cta-pair` + `--on-dark|--on-light`): two buttons tagged `data-cta-role="form|call"`
  that swap style and order at 1024px (phone: form red first; desktop: call red first). One element each.
- **Cards** (`.eys-card`): white, radius 14, soft navy shadow, lift and photo ease-in on hover;
  booking cards end in a navy button pinned to the bottom.
- **Gallery** (`.eys-gallery`, on navy): radius-10 tiles linking to project pages, caption on a
  shade at the foot of each photo; phone 2 columns, desktop 3.
- **Review card** (`.eys-quote`): white card with a large red quote mark and gold stars; the middle
  one of three is navy and raised.
- **Pills** (`.eys-pill`), **FAQ cards** (`.eys-faq-item`, plus turns to a red cross),
  **steps** (`.eys-step-num`, outlined red numerals on a rule), **photo stack** (`.eys-stack`).
- **Stripe band** (`.eys-stripe`): the skewed red/white band under the hero, aria-hidden.

## Homepage (redesign) section order
`src/components/home/redesign/`, content in `src/data/homeRedesign.ts`:
1. Hero (ground) — Eyad-and-van photo first on phone; on desktop an uncropped 3:2 slab bleeding off
the right edge behind an angled red slash · 2. Trust strip (white) · 3. Start with one visit (warm) ·
4. Our Work (ground) · 5. What customers say (warm) · 6. Who runs your project (ground, photo
full-bleed right) · 7. Services (white, photo-topped cards) · 8. About (warm, photo stack) ·
9. FAQ (white, two columns) · 10. How it works (warm) · 11. Service areas (white, pills) ·
12. Closing CTA (photo under navy) · footer (ground). Section photos the copy does not describe
are decorative (`alt=""`).

## Migration status
- **Done (26 Oct 2026):** every page is on the system — tokens re-mapped sitewide, every page on
  `siteTheme`, all inner heroes and the shared closing CTA redesigned, homepage redesigned. /home2/
  still previews the previous homepage on the black theme.
- **Next, per template:** deeper body redesigns (cards, galleries) can move components off the
  `brand-*` tokens onto `--eys-*` classes one at a time; the re-map keeps them consistent meanwhile.

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
