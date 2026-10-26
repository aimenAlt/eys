# 012: Design-system foundation for the approved redesign (no visible change)

## Decision already made
The owner team approved the homepage redesign made in Claude Design. Source: `Claude outputs/design-round3/handoff/eys-handyman-homepage-redesign/` (see 013). This item lays the foundation only: tokens, two themes (dark blue default, black), Montserrat 800, button and type classes, and the system docs. **Nothing on any existing page may change visibly.** The pages that use it come in 013 to 015.

## CSS scope rule (also applies to 013 to 015)
- All new CSS goes on new classes or under `html[data-theme]`. Add no element-level selectors and edit no existing rule. That includes the red `a:focus-visible` ring, `.seo-collapse` / `.mobile-collapse` and `.nav-underline`. Reuse those classes as they are, or restyle them through new modifier classes.
- Shared components used by legacy pages keep byte-identical default output: NavDropdown, NavMobileAccordion, NavLink, Logo, SiteImage, Section, SectionHeading, BalancedGrid. Change them only through opt-in props, or make new copies.

## Do this
### Tokens
Use the design's CSS custom properties with these exact values. Prefixing the names is fine.
- Define them on `:root` as the default "blue" theme, and override them under `[data-theme="black"]`.
- Expose them to Tailwind (for example with `@theme inline`).

blue (default):
- grounds: ground #002038; panel rgba(255,255,255,.07); panel-line rgba(255,255,255,.16); line-dark rgba(255,255,255,.12)
- accents: stripe #E30B0B; accent #E30B0B; accent-ink #E30B0B
- gold CTA: cta-bg #FDB515; cta-text #002038; cta-hover #F0A500
- red button: btn-red #E30B0B; btn-red-hover #C40909
- navy button: btn-std-bg #002038; btn-std-text #FFFFFF; btn-std-hover #0A3556
- on dark grounds: on-dark #FFFFFF; on-dark-2 #D5DEE7; on-dark-3 #B8C7D6; outline-dark rgba(255,255,255,.75)
- on light grounds: ink #002038; ink-2 #46596B; ink-3 #5F6F7E; rule #D9E0E8; white #FFFFFF; warm #F6F4F0

black (`[data-theme="black"]`) overrides only these:
- grounds: ground #0A0A0A; panel #1C1C1C; panel-line #1C1C1C
- accents: stripe #B00000; accent #FF3333; accent-ink #B00000
- red button: btn-red #B00000; btn-red-hover #8F0000
- on dark grounds: on-dark-2 #C9C9C9; on-dark-3 #B5B5B5
- on light grounds: ink #0A0A0A; ink-2 #5A5A5A; ink-3 #6B6B6B; rule #E3E3E3

Gold is identical in both themes.

### Theme switch
- Add `siteTheme: 'blue' | 'black' = 'blue'` to `src/data/sitePresentation.ts`.
- BaseLayout gets an optional `theme` prop that writes `data-theme` on `<html>`.
- Pages that don't pass it render byte-identical to today.

### Fonts
- Add `@fontsource/montserrat`. Self-host only the latin 800 woff2, with an `@font-face` block like Inter's (font-display swap, same unicode-range).
- Add a display-font token and a `.font-display` class (Montserrat 800).
- Never use `font-extrabold` for it: that is deliberately remapped to Inter 700.
- Preload the file only on pages that pass a theme.

### Type scale (from the boards)
| Style | Font | Size/line, phone | Size/line, desktop | Tracking | Notes |
|---|---|---|---|---|---|
| Eyebrow | Montserrat 800 | 11/16 | 12/16 | .14em | uppercase |
| H1 | Montserrat 800 | 36/40 | 48/52 | -.02em | |
| H2 | Montserrat 800 | 26/30 | 32/36 | -.01em | |
| H3 | Montserrat 800 | 20/26 | 20/26 | | |
| Big figure | Montserrat 800 | 32/36 | 32/36 | -.02em | |
| Body | Inter 400 | 16/24 | 17/26 | | |
| Small | Inter | 15/22, 14/20, 13/18, 12/16 | same | | |

In the new classes only, headings use `text-wrap: balance` and paragraphs use `text-wrap: pretty`.

### Buttons (component or classes, your call)
Base:
- 52px tall, radius 6px, Inter 700 16px, gap 10px.
- The design's 18px stroke phone icon.
- nowrap.
- Inline buttons: padding 0 28px. On phone: full width.

Variants:
- **gold**: cta-bg with cta-text, cta-hover on hover.
- **red**: btn-red with white text, btn-red-hover on hover.
- **navy**: btn-std.
- **outline-light**: 2px outline-dark border, white text, for dark grounds.
- **outline-dark**: 2px ink border, ink text, for light grounds.

Focus rings: 2px white with offset 2 on dark grounds, 2px ink on light grounds. Transitions respect prefers-reduced-motion.

### The owner's button rule (document it; every redesigned page obeys it)
- **Exactly one gold button per screen: the header's top-right CTA.**
  - Phone/tablet (<1024px): gold "Call".
  - Desktop (≥1024px): gold "Get a Free Quote".
- The only other gold is the phone bottom bar's "Call", which is the same action. It appears only after the hero buttons scroll away, and the header Call hides while the bar shows.
- **The other action is red.**
  - Phone/tablet: form buttons are red and call buttons are outline.
  - Desktop: call buttons are red and form buttons are outline.
  - The same element swaps its style and order at 1024px. Never duplicate buttons.
- A repeat of the gold action lower on the page is an outline button.
- Card booking buttons are solid navy.
- Gold never sits on a light ground.
- Red stays on the logo, the stripe and the offer line.

### Docs (system only; components and the homepage get documented in 013)
- **AGENTS.md**: replace the "Design doctrine" bullets with the new system (about 10 lines, pointing to docs/03). Note that legacy templates keep the old black/red look until they're migrated.
- **docs/03-design-system.md**: rewrite it as the source of truth. Cover:
  - tokens for both themes
  - fonts and the type scale
  - spacing, container and breakpoints
  - the button rule
  - accessibility (focus rings, contrast)
  - copy rules (non-breaking spaces and nowrap)
  - images (SiteImage only)
  - migration status

## Verification
- check, `npm test` and build are all clean.
- **No-change proof:** screenshot "/" and /services/tv-mounting/ at 390 and 1440 from this build and from the previous commit's build. They must be pixel-identical (or prove the same with a DOM plus computed-style diff).
- Live "/" is unchanged after the deploy.
