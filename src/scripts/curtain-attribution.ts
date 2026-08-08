/**
 * Curtain landing conversion helpers:
 * - Forward inbound UTMs / click IDs onto Jobber CTAs
 * - Fire Meta Pixel `Schedule` on high-ceiling booking clicks (link still opens normally)
 */
import { trackMetaEvent } from '../utils/analytics';
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

function wireHighCeilingMetaSchedule(): void {
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>('a[data-curtain-cta="high_ceiling"][href]');
      if (!link) return;
      if (!link.href.includes('getjobber.com')) return;

      // Do not preventDefault — Jobber must open normally after this fires.
      trackMetaEvent('Schedule', {
        content_name: 'High-Ceiling Curtain Installation',
        content_category: 'Curtain Installation',
      });
    },
    { capture: true },
  );
}

decorateCurtainJobberLinks();
wireHighCeilingMetaSchedule();
document.addEventListener('astro:page-load', decorateCurtainJobberLinks);
