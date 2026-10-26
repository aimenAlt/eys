# Design System — EYS

Source of truth for the approved redesign (Claude Design, Round 3.3, Oct 2026; backlog 012–015).
Code: tokens, fonts, type and button classes at the end of `src/styles/global.css`; theme switch
`siteTheme` in `src/data/sitePresentation.ts`; `BaseLayout theme=…` writes `data-theme` on `<html>`.

## Direction
Premium local contractor: dark grounds on the header, hero, the "Who runs your project" band and
the footer; everything else on white `#FFFFFF` or warm `#F6F4F0`. Real project photos, angular
skewed red/white stripe, one gold button per screen. Not a flyer: no cartoon icons, busy
backgrounds, gradients on surfaces or gimmicky animation.

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
| `.eys-eyebrow` | Montserrat 800, uppercase | 11/16 | 12/16 | .14em |
| `.eys-h1` | Montserrat 800 | 36/40 | 48/52 | -.02em |
| `.eys-h2` | Montserrat 800 | 26/30 | 32/36 | -.01em |
| `.eys-h3` | Montserrat 800 | 20/26 | 20/26 | — |
| `.eys-figure` (big figure) | Montserrat 800 | 32/36 | 32/36 | -.02em |
| `.eys-body` | Inter 400 | 16/24 | 17/26 | — |
| `.eys-small-15/14/13/12` | Inter | 15/22, 14/20, 13/18, 12/16 | same | — |

## Spacing, container, breakpoints
- Breakpoints: phone < 768, tablet 768–1023, desktop ≥ 1024 (layout switch), wide ≥ 1280 (board columns).
- Desktop content capped at 1328px and centred (56px side padding at 1440), backgrounds full-bleed.
  Phone side padding 24px. Section padding 48px phone, 72px desktop.
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

## Migration status
- **System:** tokens, themes, fonts, type and buttons shipped (backlog 012). No page uses them yet.
- **Legacy templates** (everything today) keep the old black/red look: `brand-*` tokens (`#b00000`,
  `#0a0a0a`), Inter only, `.gradient-btn`. They are migrated one template at a time and switch to
  `siteTheme` when they are.

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
