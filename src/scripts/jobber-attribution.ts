/**
 * Forward inbound UTMs / paid click IDs (gclid, gbraid, wbraid, fbclid, …) onto
 * every outbound Jobber link and Jobber embed on the site.
 *
 * Loaded site-wide via `conversion-analytics.ts` (BaseLayout). It used to live in
 * `curtain-attribution.ts` and only ran on four pages against links tagged
 * `data-curtain-cta`, which silently dropped attribution on `/`, `/book/`,
 * `/contact/`, `/services/handyman-to-do-list/`, `/services/tv-mounting/`, and
 * `/services/picture-hanging-floating-shelves/`. Matching on the Jobber host
 * instead of an opt-in attribute means new CTAs are covered by default.
 */
import {
  readAttributionParams,
  withAttributionParams,
  type AttributionParams,
} from '../utils/utm';

const SESSION_KEY = 'eys_attribution_v1';
/** Superseded key — still read so a visit already in flight keeps its attribution. */
const LEGACY_SESSION_KEY = 'eys_curtain_attribution_v1';

const JOBBER_LINK_SELECTOR = 'a[href*="getjobber.com"]';

function readSession(): AttributionParams {
  for (const key of [SESSION_KEY, LEGACY_SESSION_KEY]) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AttributionParams;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      /* private mode / malformed — fall through */
    }
  }
  return {};
}

function writeSession(attribution: AttributionParams): void {
  if (!Object.keys(attribution).length) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(attribution));
  } catch {
    /* private mode / quota — ignore */
  }
}

/** Inbound URL params win; the session fills gaps once the visitor navigates on. */
export function currentAttribution(): AttributionParams {
  const merged = { ...readSession(), ...readAttributionParams(window.location.search) };
  writeSession(merged);
  return merged;
}

/** Copy the visit's attribution onto a Jobber URL. Safe to call with anything. */
export function withJobberAttribution(url: string): string {
  const attribution = currentAttribution();
  if (!Object.keys(attribution).length) return url;
  return withAttributionParams(url, attribution);
}

export function decorateJobberLinks(): void {
  const attribution = currentAttribution();
  if (!Object.keys(attribution).length) return;

  document.querySelectorAll<HTMLAnchorElement>(JOBBER_LINK_SELECTOR).forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Decorate from the clean base captured on first pass so repeat runs stay idempotent.
    const base = link.dataset.jobberBaseHref || href;
    if (!link.dataset.jobberBaseHref) {
      link.dataset.jobberBaseHref = base;
    }
    link.href = withAttributionParams(base, attribution);
  });
}
