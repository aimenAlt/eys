/**
 * Pages Google Ads sends people to: every ad final URL and sitelink.
 *
 * Source: Google Ads landing-page report, Sep 25 – Oct 24, 2026 (backlog 011).
 * Clicks in that window, for reference: /start/ 44, /services/media-walls/ 41,
 * /lp/built-ins-shelving-storage/ 24, /services/repairs-and-maintenance/ 11,
 * /services/limewash-walls/ 7, /services/handyman-to-do-list/ 6, /our-work/ 2,
 * /services/tv-mounting/ 1, /services/custom-carpentry/ 0 (still a final URL).
 *
 * This list changes only when ad final URLs or sitelinks change. Every
 * placement of `VanBand` reads it — never hard-code a path elsewhere.
 */
export const adsLandingPages = [
  '/start/',
  '/services/media-walls/',
  '/lp/built-ins-shelving-storage/',
  '/services/repairs-and-maintenance/',
  '/services/limewash-walls/',
  '/services/handyman-to-do-list/',
  '/our-work/',
  '/services/tv-mounting/',
  '/services/custom-carpentry/',
] as const;

/** True when `pathname` (with or without a trailing slash) is a Google Ads landing page. */
export function isAdsLandingPage(pathname: string): boolean {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return (adsLandingPages as readonly string[]).includes(normalized);
}
