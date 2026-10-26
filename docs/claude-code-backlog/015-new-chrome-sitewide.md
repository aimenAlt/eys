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
