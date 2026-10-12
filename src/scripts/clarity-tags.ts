/**
 * Session-level tags for Microsoft Clarity, so recordings and heatmaps can be
 * filtered by template, first landing page and paid source.
 *
 * Loaded site-wide via `conversion-analytics.ts` (BaseLayout). No-ops whenever
 * `window.clarity` is absent: off the live host, and for visitors who opted out
 * on /privacy/ (BaseLayout never loads the tag for them).
 *
 * Tags carry only template names, site paths and traffic classes — never names,
 * contact details or phone digits. Do not add `clarity('identify')`.
 */
import { analyticsPageType } from '../utils/analytics';
import { currentAttribution, firstLandingPath } from './jobber-attribution';

/** Clarity tag values are short labels; a hand-typed utm_source can be anything. */
const TAG_MAX = 40;

function trafficClass(): string {
  const attribution = currentAttribution();
  if (attribution.gclid || attribution.gbraid || attribution.wbraid) return 'google_ads';
  if (attribution.fbclid) return 'meta';
  if (attribution.utm_medium?.toLowerCase().includes('qr')) return 'qr';
  if (attribution.utm_source) return attribution.utm_source.toLowerCase().slice(0, TAG_MAX);
  return 'none';
}

function setClarityTags(): void {
  const clarity = window.clarity;
  if (typeof clarity !== 'function') return;
  clarity('set', 'page_type', analyticsPageType());
  const landingPath = firstLandingPath();
  if (landingPath) clarity('set', 'landing_path', landingPath);
  clarity('set', 'traffic', trafficClass());
}

setClarityTags();
