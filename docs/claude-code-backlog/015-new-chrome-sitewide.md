# 015: New header, footer and bottom bar on every standard page

## Gate (check first; if it fails, stop and mark this item BLOCKED)
014 is DONE and live-verified.

## Decision already made
Every page that uses ContentLayout gets the new site chrome from 013. Those pages still have the old black heroes and red buttons in their bodies, so ContentLayout renders them with `theme="black"`. The new chrome then matches them: black grounds, #B00000 red, same gold. Page bodies do not change in this item. Each template is redesigned later, and switches to `siteTheme` at that point.

## Do this
1. `src/layouts/ContentLayout.astro`:
   - swap Header, Footer and MobileStickyCTA for the new header, footer and bottom bar
   - render through `BaseLayout theme="black"`
   - `hideMobileStickyCta` keeps working, hiding the new bar on /request-confirmed/ and /booking-confirmed/
2. /home2/ (the old-homepage preview) uses the same new chrome with `theme="black"`.
3. Pages that render their own header and footer stay untouched. Don't change them:
   - /van/, /start/, /curtain-installation/, /services/media-walls/
   - /lp/built-ins-shelving-storage/, /go/[slug], /essa/
4. Delete the legacy Header.astro, Footer.astro and MobileStickyCTA.astro only once nothing imports them. The same goes for Logo, NavDropdown, NavMobileAccordion and NavLink if they become unused. Remove CSS only when no remaining markup uses it.
5. Docs:
   - AGENTS.md: core components and migration status.
   - docs/03: migration status. The chrome is live sitewide; legacy page bodies are still on the old look.
   - docs/analytics-events.md: header and footer placements are now sitewide.
     - `header_call` and `header_quote` are new.
     - The desktop header no longer has Home, Book or Contact links. Those stay in the mobile menu and the footer, so the `nav_book` and `nav_contact` placements change.
     - The bottom bar lost its "Open until 11:30 PM" caption, and its second button is now "Free Quote".

## Verification
**Before pushing,** build both versions (this one and the previous commit) and compare these pages:
- /services/tv-mounting/
- a city page, a community page, a city-service page
- /our-work/ and one project page
- /pricing/, /contact/, /book/, /about/, /reviews/
- one blog post
- one /request-confirmed/ page
- /404

For each page, the `<main>` HTML must be byte-identical between the two builds.

**Playwright at 390, 1024 and 1440**, on those pages:
- header, footer and bar render correctly
- the gold count rule holds (1 on screen; the bar hides on the confirmation pages)
- no overflow, no wrapped labels
- the analytics selectors from 013 are present
- the menu opens and closes and closes on link tap
- no console errors

**Pages that must not change:** the own-chrome pages listed in step 3 must produce identical HTML before and after.

**Live, after the deploy:** spot-check 5 of those pages at 390 and 1440, clicking no CTAs.

**If anything fails** and can't be fixed forward: revert, confirm the revert is live, mark BLOCKED, stop.

## Build notes (Claude Code, 26 Oct 2026)
Gate: 014 DONE (1a19957) and live-verified the same day.

Decisions:
- ContentLayout renders SiteHeader / SiteFooter / SiteBottomBar through `BaseLayout theme="black"`; `hideMobileStickyCta` now omits SiteBottomBar (the /request-confirmed/ and /booking-confirmed/ pages). VanBand placement (011) unchanged.
- /home2/ (previous-homepage preview) and the non-redesign branch of `src/pages/index.astro` use the same new chrome on `theme="black"`, so nothing imports the legacy chrome any more. Deleted: `Header.astro`, `Footer.astro`, `MobileStickyCTA.astro`, `NavDropdown.astro`, `NavMobileAccordion.astro`, `NavLink.astro`. `Logo.astro` stays (StartHeader, MediaWallHeader, CurtainHeader and the built-ins LP use it).
- CSS: removed only `.nav-underline`, which the deleted Header was the last user of. `.custom-scrollbar` and `.lazy-bg` were already unused before this item and are left for a separate cleanup. Tailwind also stops generating utilities that only the deleted components used, so the inlined stylesheet shrinks on every page.
- There are no published city-service pages (all 18 entries are drafts), so that comparison has nothing to cover.

Verification, local production builds of this commit and the previous one (dea232e):
- `<main>` HTML byte-identical on all 114 built pages (incl. /services/tv-mounting/, Katy, Cinco Ranch, /our-work/, a project page, /pricing/, /contact/, /book/, /about/, /reviews/, the blog post, /request-confirmed/media-wall/, /404).
- Own-chrome pages (/start/, /van/, /curtain-installation/, /services/media-walls/, /lp/built-ins-shelving-storage/, /go/curtains/, /essa/): HTML identical outside the inlined `<style>`; full-page screenshots proved flaky on these video pages (the same build differs from itself), so the proof is a DOM + computed-style diff of every element (40 properties) at 390, 1024 and 1440: identical.
- Playwright at 390, 1024 and 1440 on those 13 ContentLayout pages plus /home2/: new header/footer render, black theme (rgb(10,10,10) grounds), analytics hooks present (`header`, `footer#contact[data-site-footer]`, #mobile-menu / #mobile-menu-toggle / #mobile-menu-backdrop with `[data-close-mobile-menu]`, the Quick actions region), exactly one visible gold element at the top, mid-page and footer, bar absent on the confirmation page and on desktop, no overflow, no wrapped chrome labels, one H1, menu opens/closes and closes on a link tap, no console errors.
