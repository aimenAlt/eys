/**
 * Fire Meta + GA4 completion events on post-Jobber confirmation pages.
 * Deduplicates accidental refreshes per service within the same browser session.
 * Do not send PII.
 */
import { trackEvent, trackMetaEvent } from '../utils/analytics';

export type ConfirmationTrackingPayload = {
  metaEvent: 'Schedule' | 'Lead';
  analyticsEvent: 'booking_complete' | 'lead_submit';
  contentName: string;
  contentCategory: string;
  service: string;
};

function dedupeKey(metaEvent: ConfirmationTrackingPayload['metaEvent'], service: string): string {
  const eventType = metaEvent === 'Schedule' ? 'schedule' : 'lead';
  return `eys_confirmation_${eventType}_${service}`;
}

function alreadyFired(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markFired(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* private mode / quota — ignore */
  }
}

export function fireJobberConfirmationTracking(payload: ConfirmationTrackingPayload): void {
  const key = dedupeKey(payload.metaEvent, payload.service);
  if (alreadyFired(key)) return;

  const params = {
    content_name: payload.contentName,
    content_category: payload.contentCategory,
    service: payload.service,
  };

  trackMetaEvent(payload.metaEvent, params);
  trackEvent(payload.analyticsEvent, params);
  markFired(key);
}

function readPayloadFromDom(): ConfirmationTrackingPayload | null {
  const root = document.querySelector<HTMLElement>('[data-jobber-confirmation]');
  if (!root) return null;

  const metaEvent = root.dataset.metaEvent;
  const analyticsEvent = root.dataset.analyticsEvent;
  const contentName = root.dataset.contentName;
  const contentCategory = root.dataset.contentCategory;
  const service = root.dataset.service;

  if (
    (metaEvent !== 'Schedule' && metaEvent !== 'Lead') ||
    (analyticsEvent !== 'booking_complete' && analyticsEvent !== 'lead_submit') ||
    !contentName ||
    !contentCategory ||
    !service
  ) {
    return null;
  }

  return { metaEvent, analyticsEvent, contentName, contentCategory, service };
}

function run(): void {
  const payload = readPayloadFromDom();
  if (!payload) return;
  fireJobberConfirmationTracking(payload);
}

run();
document.addEventListener('astro:page-load', run);
