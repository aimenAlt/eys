/**
 * Fire Meta + GA4 completion events on post-Jobber confirmation pages.
 * Do not send PII.
 *
 * Firing exactly once per confirmation per session matters more here than
 * anywhere else on the site: these are the conversions. Over 28 days to
 * 21 Sep 2026 `lead_submit` fired 16 times from 11 users while Jobber's own
 * `generate_lead` fired 9 times from 9 users, so roughly a third of our
 * recorded leads were the same person counted twice — a reload of the
 * confirmation page, or a back-navigation onto it, each re-ran this module.
 *
 * Three guards, because the old single sessionStorage check was not enough:
 *
 *   1. `initialised` stops `run()` executing twice in one page lifetime, which
 *      is what happened when the module's own call and the `astro:page-load`
 *      listener both ran on the first load.
 *   2. `firedThisPageview` is an in-memory record, so the dedupe still holds
 *      when sessionStorage throws (private mode, blocked site storage) — the
 *      old code treated a throw as "not yet fired" and re-sent on every view.
 *   3. The sessionStorage key is the slug, which is what actually identifies a
 *      confirmation page, and it is written BEFORE the events are sent so a
 *      fast second load cannot slip between the check and the write.
 */
import { CONVERSION_CURRENCY, conversionValueUsd } from '../data/conversionValues';
import { trackEvent, trackMetaEvent } from '../utils/analytics';

export type ConfirmationTrackingPayload = {
  metaEvent: 'Schedule' | 'Lead';
  analyticsEvent: 'booking_complete' | 'lead_submit';
  contentName: string;
  contentCategory: string;
  service: string;
  /** Confirmation slug — the per-page dedupe identity. */
  slug: string;
};

/** Survives reloads and back-navigation within the tab's session. */
function dedupeKey(slug: string): string {
  return `eys_confirmation_${slug}`;
}

/** Survives a sessionStorage that throws on read or write. */
const firedThisPageview = new Set<string>();

function alreadyFired(key: string): boolean {
  if (firedThisPageview.has(key)) return true;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markFired(key: string): void {
  firedThisPageview.add(key);
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* private mode / quota — the in-memory guard still holds for this pageview */
  }
}

export function fireJobberConfirmationTracking(payload: ConfirmationTrackingPayload): void {
  const key = dedupeKey(payload.slug);
  if (alreadyFired(key)) return;
  // Claim the slot before sending, never after.
  markFired(key);

  const params = {
    content_name: payload.contentName,
    content_category: payload.contentCategory,
    service: payload.service,
  };

  trackMetaEvent(payload.metaEvent, params);
  trackEvent(payload.analyticsEvent, {
    ...params,
    value: conversionValueUsd(payload.analyticsEvent),
    currency: CONVERSION_CURRENCY,
  });
}

function readPayloadFromDom(): ConfirmationTrackingPayload | null {
  const root = document.querySelector<HTMLElement>('[data-jobber-confirmation]');
  if (!root) return null;

  const metaEvent = root.dataset.metaEvent;
  const analyticsEvent = root.dataset.analyticsEvent;
  const contentName = root.dataset.contentName;
  const contentCategory = root.dataset.contentCategory;
  const service = root.dataset.service;
  const slug = root.dataset.slug;

  if (
    (metaEvent !== 'Schedule' && metaEvent !== 'Lead') ||
    (analyticsEvent !== 'booking_complete' && analyticsEvent !== 'lead_submit') ||
    !contentName ||
    !contentCategory ||
    !service ||
    !slug
  ) {
    return null;
  }

  return { metaEvent, analyticsEvent, contentName, contentCategory, service, slug };
}

function run(): void {
  const payload = readPayloadFromDom();
  if (!payload) return;
  fireJobberConfirmationTracking(payload);
}

let initialised = false;

function init(): void {
  if (initialised) return;
  initialised = true;
  run();
  // A client-side navigation onto another confirmation page is a different
  // slug, so it still gets its own single event.
  document.addEventListener('astro:page-load', run);
}

init();
