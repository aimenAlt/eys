/**
 * Forward inbound landing-page attribution (UTMs + click IDs) onto curtain Jobber CTAs.
 *
 * - Captures params from the current URL into sessionStorage for the visit
 * - Decorates plain <a data-curtain-cta> hrefs so Jobber receives source context
 * - Leaves anchors as normal links so GA4 cross-domain linker can still add `_gl`
 */
import {
  readAttributionParams,
  withAttributionParams,
  type AttributionParams,
} from '../utils/utm';

const SESSION_KEY = 'eys_curtain_attribution_v1';

function readSession(): AttributionParams {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AttributionParams;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSession(attribution: AttributionParams): void {
  if (!Object.keys(attribution).length) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(attribution));
  } catch {
    /* private mode / quota — ignore */
  }
}

function currentAttribution(): AttributionParams {
  const fromUrl = readAttributionParams(window.location.search);
  const fromSession = readSession();
  // URL wins for this landing; session fills gaps if the visitor scrolls after a soft nav.
  const merged = { ...fromSession, ...fromUrl };
  writeSession(merged);
  return merged;
}

function decorateCurtainJobberLinks(): void {
  const attribution = currentAttribution();
  if (!Object.keys(attribution).length) return;

  document.querySelectorAll<HTMLAnchorElement>('a[data-curtain-cta][href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || !href.includes('getjobber.com')) return;
    // Always decorate from the clean base stored on first paint if present.
    const base = link.dataset.jobberBaseHref || href;
    if (!link.dataset.jobberBaseHref) {
      link.dataset.jobberBaseHref = base;
    }
    link.href = withAttributionParams(base, attribution);
  });
}

decorateCurtainJobberLinks();
document.addEventListener('astro:page-load', decorateCurtainJobberLinks);
